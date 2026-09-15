import axios from "axios";
import * as xml2js from "xml2js";

const PropByPath = require("prop-by-path");

import {
  EventExternalServiceProvider,
  ExternalServiceSendResult,
  ExternalServiceSendContext,
} from "@liquio/plugin-sdk";
import { XroadOptions, XroadServiceConfig, XroadTrembitaHeader } from "./types";

const MAX_LOG_LENGTH = 100e3 - 1000;

/**
 * Shape of the `data` argument that `TrembitaProvider#send` used to receive
 * (`components/event/src/services/event/requester/external_service/providers/trembita.js`).
 * `service` is used to look up the per-service config (now `this.options.serviceList`
 * / `this.options.trembitaHeader` instead of `global.config`, see `getTrembitaConfig`
 * below).
 */
interface XroadSendData {
  transformedData: {
    workflowId?: string;
    documentId?: string;
    soapMessage: string;
    soapMessageForLog: string;
    sendFileFromEventKeyName?: string;
    fileIdFromEvent?: string;
  };
  service: string;
}

/**
 * X-Road (Trembita) external-service provider.
 *
 * Exact behavioral port of `TrembitaProvider`
 * (`components/event/src/services/event/requester/external_service/providers/trembita.js`).
 * Only the plumbing changed:
 * - the old per-process singleton pattern is dropped: `PluginLoader` already
 *   instantiates exactly one `XroadProvider` per configured plugin entry, so
 *   the singleton was redundant;
 * - `global.log.save(...)` becomes `this.context.log.save(...)` (`Log#save`
 *   has signature `save(type: string, data?: any, level?: string)`, see
 *   `packages/back-core/src/common/log/index.ts` — called positionally here
 *   exactly like the original);
 * - the original called `axios` directly (not `this.httpClient`, which
 *   `Provider`'s constructor set from `global.httpClient` but which
 *   `TrembitaProvider#send` never actually used), so this keeps calling
 *   `axios` directly;
 * - `TrembitaProvider#getTrembitaConfig` used to read
 *   `global.config.requester.externalService.trembita.{trembitaHeader,serviceList}`.
 *   That global config doesn't exist inside a plugin, so the equivalent data
 *   now lives on `this.options.trembitaHeader` / `this.options.serviceList`
 *   (see `types.ts`) and `getTrembitaConfig` below reads from there instead —
 *   the lookup logic itself (`serviceList[service] || trembitaHeader.service`,
 *   plus the same validation) is unchanged;
 * - none of `Provider`'s other members (`prepareLogType`,
 *   `getTrembitaSoapApiParams`, `getTrembitaRestApiV1Params`,
 *   `getTrembitaRestApiV2Params`, `apiTypes`, `sandbox`) are referenced by
 *   `TrembitaProvider#send`, so nothing else needed porting.
 */
export class XroadProvider extends EventExternalServiceProvider<XroadOptions> {
  async send(
    data: unknown,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    isTest?: boolean,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ctx?: ExternalServiceSendContext,
  ): Promise<ExternalServiceSendResult> {
    const { timeout = 20000, debug = false, trembitaUrl } = this.options;

    // Get params.
    const { transformedData, service } = data as XroadSendData;
    const {
      workflowId,
      documentId,
      soapMessage,
      soapMessageForLog,
      sendFileFromEventKeyName,
      fileIdFromEvent,
    } = transformedData;

    // Get service config.
    const trembitaConfig = this.getTrembitaConfig(service);

    const requestOptions: Record<string, unknown> = {
      url: trembitaUrl,
      method: "POST",
      headers: {
        "Content-Type": "text/xml",
        SOAPAction: trembitaConfig.serviceConfig.soapAction,
      },
      data: soapMessage,
      timeout,
      requestBodySizeInMB: soapMessage.length / 1000 / 1000,
    };

    const ending = "<...cut>";
    const soapMessageCutToLog =
      soapMessage.length > MAX_LOG_LENGTH
        ? soapMessage.substring(0, MAX_LOG_LENGTH - ending.length) + ending
        : soapMessage;

    this.context.log.save("send-to-trembita|request-options", {
      requestOptions: {
        ...requestOptions,
        data: debug ? soapMessageCutToLog : soapMessageForLog,
      },
      sendFileFromEventKeyName: sendFileFromEventKeyName || "",
      fileIdFromEvent,
      workflowId,
      documentId,
    });

    // Do request.
    const { data: response } = await axios(requestOptions);
    this.context.log.save("send-to-trembita|response", { response });

    // Check external service response.
    const responseSoapMessage = await this.prepareResponseSoapMessage(response);

    let parsedResponse: Record<string, unknown> = {};
    try {
      parsedResponse = await this.convertXmlToJsObject(responseSoapMessage);
    } catch (error) {
      this.context.log.save("send-to-trembita|parse-response-error", {
        error: error && (error as Error).message,
        response,
        responseSoapMessage,
      });
      parsedResponse = {};
    }

    let isDone: boolean;

    let isFault = false;
    if (
      trembitaConfig.serviceConfig.serviceCode === "PostPetition" &&
      PropByPath.get(parsedResponse, "s:Envelope.s:Body.0.s:Fault.0")
    ) {
      isFault = true;
    }
    if (
      (trembitaConfig.serviceConfig.serviceCode === "PostPetition8" ||
        trembitaConfig.serviceConfig.serviceCode === "PostPetition13" ||
        trembitaConfig.serviceConfig.serviceCode === "PostPetition14" ||
        trembitaConfig.serviceConfig.serviceCode === "PostPetition15" ||
        trembitaConfig.serviceConfig.serviceCode === "PostPetition16" ||
        trembitaConfig.serviceConfig.serviceCode === "PostPetition18" ||
        trembitaConfig.serviceConfig.serviceCode === "PostPetition27") &&
      parseInt(
        PropByPath.get(
          parsedResponse,
          "s:Envelope.s:Body.0.PetitionExchangeExpAnswer.0.FaultCode",
        ),
      ) !== 0
    ) {
      isFault = true;
    }

    this.context.log.save("send-to-trembita|parsed-response", {
      response,
      isFault,
    });
    if (!isFault) {
      const responseDoneParams: Record<string, boolean> = {};
      let responseParam;

      // Check for PetitionExchange
      responseParam = PropByPath.get(
        parsedResponse,
        "s:Envelope.s:Body.0.PetitionExchangeAnswer.0.done.0",
      );
      if (responseParam)
        responseDoneParams["PetitionExchange"] = responseParam === "true";

      // Check for listMethods
      responseParam = PropByPath.get(
        parsedResponse,
        "s:Envelope.s:Body.0.xro:listMethodsResponse.0",
      );
      if (responseParam) responseDoneParams["listMethods"] = !!responseParam;

      isDone = Object.keys(responseDoneParams).length > 0;
    } else {
      this.context.log.save("send-to-trembita|parsed-response|error", {
        response,
        isDone: false,
      });
      const error: Error & { details?: unknown } = new Error(response);
      error.details = {
        requestOptions: debug
          ? requestOptions
          : { ...requestOptions, body: "***" },
      };
      throw error;
    }

    return {
      request: debug ? requestOptions : undefined,
      response,
      isDone,
    };
  }

  private async prepareResponseSoapMessage(response: string): Promise<string> {
    let newResponse = response;
    newResponse = newResponse.split("SOAP-ENV").join("s");
    newResponse = newResponse.split("soapenv").join("s");
    const responseSoapMessageStartIndex = newResponse.indexOf("<s:Envelope");
    const responseSoapMessageEndIndex =
      newResponse.indexOf("</s:Envelope>") + 13;
    newResponse = newResponse.substring(
      responseSoapMessageStartIndex,
      responseSoapMessageEndIndex,
    );

    return newResponse;
  }

  /**
   * Convert XML to JS object.
   * @private
   */
  private async convertXmlToJsObject(
    xml: string,
  ): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      xml2js.parseString(
        xml,
        (error: Error | null, jsObject: Record<string, unknown>) => {
          // Check.
          if (error) {
            reject(error);
          }

          // Resolve JS object.
          resolve(jsObject);
        },
      );
    });
  }

  /**
   * @private
   * @param service Service name
   * @return Service config
   */
  private getTrembitaConfig(service: string): {
    trembitaHeader: XroadTrembitaHeader;
    serviceConfig: XroadServiceConfig;
  } {
    const { trembitaHeader, serviceList = {} } = this.options;

    // Get specific or default service config.
    const serviceConfig = serviceList[service] || trembitaHeader.service;

    if (!serviceConfig) {
      throw new Error("Trembita provider. Service config not defined.");
    }

    if (!serviceConfig?.soapAction) {
      throw new Error("Trembita provider. Service soap action not defined.");
    }

    return { trembitaHeader, serviceConfig };
  }
}
