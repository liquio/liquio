import axios from "axios";

import { PluginContext } from "@liquio/plugin-sdk";
import { XroadProvider } from "./xroad_provider";
import { XroadOptions } from "./types";

jest.mock("axios");
const mockedAxios = axios as jest.MockedFunction<typeof axios>;

describe("XroadProvider", () => {
  let logSave: jest.Mock;
  let context: PluginContext;

  const baseOptions: XroadOptions = {
    trembitaUrl: "https://trembita.example.com/soap",
    timeout: 20000,
    debug: false,
    trembitaHeader: {
      service: {
        soapAction: "http://x-road.eu/xsd/xroad.xsd#PostPetition",
        serviceCode: "PostPetition",
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    logSave = jest.fn().mockResolvedValue("log-id");
    context = {
      log: { save: logSave } as unknown as PluginContext["log"],
      pluginConfig: {},
    };
  });

  const buildData = () => ({
    transformedData: {
      workflowId: "wf-1",
      documentId: "doc-1",
      soapMessage: "<soap:Envelope>request</soap:Envelope>",
      soapMessageForLog: "<soap:Envelope>request-for-log</soap:Envelope>",
      sendFileFromEventKeyName: "file-key",
      fileIdFromEvent: "file-1",
    },
    service: "PostPetition",
  });

  it("sends a SOAP request and returns { request, response, isDone: true } on success", async () => {
    const responseXml =
      "<SOAP-ENV:Envelope><SOAP-ENV:Body><PetitionExchangeAnswer><done>true</done></PetitionExchangeAnswer></SOAP-ENV:Body></SOAP-ENV:Envelope>";
    mockedAxios.mockResolvedValueOnce({ data: responseXml });

    const provider = new XroadProvider(context, {
      ...baseOptions,
      debug: true,
    });
    const result = await provider.send(buildData());

    expect(mockedAxios).toHaveBeenCalledWith(
      expect.objectContaining({
        url: baseOptions.trembitaUrl,
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "text/xml",
          SOAPAction: baseOptions.trembitaHeader.service.soapAction,
        }),
        data: buildData().transformedData.soapMessage,
        timeout: baseOptions.timeout,
      }),
    );
    expect(result.response).toBe(responseXml);
    expect(result.isDone).toBe(true);
    expect(result.request).toBeDefined();
  });

  it("omits the request from the result when debug is false", async () => {
    const responseXml =
      "<SOAP-ENV:Envelope><SOAP-ENV:Body><PetitionExchangeAnswer><done>true</done></PetitionExchangeAnswer></SOAP-ENV:Body></SOAP-ENV:Envelope>";
    mockedAxios.mockResolvedValueOnce({ data: responseXml });

    const provider = new XroadProvider(context, baseOptions);
    const result = await provider.send(buildData());

    expect(result.request).toBeUndefined();
  });

  it("throws when the response is a SOAP fault for a PostPetition service", async () => {
    const responseXml =
      "<SOAP-ENV:Envelope><SOAP-ENV:Body><SOAP-ENV:Fault><faultstring>boom</faultstring></SOAP-ENV:Fault></SOAP-ENV:Body></SOAP-ENV:Envelope>";
    mockedAxios.mockResolvedValueOnce({ data: responseXml });

    const provider = new XroadProvider(context, baseOptions);

    await expect(provider.send(buildData())).rejects.toThrow();
  });

  it("throws when a PostPetition8-style response has a non-zero FaultCode", async () => {
    const responseXml =
      "<SOAP-ENV:Envelope><SOAP-ENV:Body><PetitionExchangeExpAnswer><FaultCode>1</FaultCode></PetitionExchangeExpAnswer></SOAP-ENV:Body></SOAP-ENV:Envelope>";
    mockedAxios.mockResolvedValueOnce({ data: responseXml });

    const options: XroadOptions = {
      ...baseOptions,
      trembitaHeader: {
        service: {
          soapAction: "http://x-road.eu/xsd/xroad.xsd#PostPetition8",
          serviceCode: "PostPetition8",
        },
      },
    };
    const provider = new XroadProvider(context, options);

    await expect(provider.send(buildData())).rejects.toThrow();
  });

  it("does not fault when a PostPetition8-style response has a zero FaultCode", async () => {
    const responseXml =
      "<SOAP-ENV:Envelope><SOAP-ENV:Body><PetitionExchangeExpAnswer><FaultCode>0</FaultCode></PetitionExchangeExpAnswer></SOAP-ENV:Body></SOAP-ENV:Envelope>";
    mockedAxios.mockResolvedValueOnce({ data: responseXml });

    const options: XroadOptions = {
      ...baseOptions,
      trembitaHeader: {
        service: {
          soapAction: "http://x-road.eu/xsd/xroad.xsd#PostPetition8",
          serviceCode: "PostPetition8",
        },
      },
    };
    const provider = new XroadProvider(context, options);

    const result = await provider.send(buildData());

    expect(result.isDone).toBe(false);
  });

  it("reports isDone: true for a listMethods response", async () => {
    const responseXml =
      "<SOAP-ENV:Envelope><SOAP-ENV:Body><xro:listMethodsResponse>x</xro:listMethodsResponse></SOAP-ENV:Body></SOAP-ENV:Envelope>";
    mockedAxios.mockResolvedValueOnce({ data: responseXml });

    const provider = new XroadProvider(context, baseOptions);
    const result = await provider.send(buildData());

    expect(result.isDone).toBe(true);
  });

  it("uses serviceList[service] over trembitaHeader.service when present", async () => {
    const responseXml =
      "<SOAP-ENV:Envelope><SOAP-ENV:Body><PetitionExchangeAnswer><done>true</done></PetitionExchangeAnswer></SOAP-ENV:Body></SOAP-ENV:Envelope>";
    mockedAxios.mockResolvedValueOnce({ data: responseXml });

    const options: XroadOptions = {
      ...baseOptions,
      serviceList: {
        PostPetition: {
          soapAction: "http://x-road.eu/xsd/xroad.xsd#OverriddenAction",
          serviceCode: "PostPetition",
        },
      },
    };
    const provider = new XroadProvider(context, options);
    await provider.send(buildData());

    expect(mockedAxios).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          SOAPAction: "http://x-road.eu/xsd/xroad.xsd#OverriddenAction",
        }),
      }),
    );
  });

  it("throws when the resolved service config has no soapAction", async () => {
    const options: XroadOptions = {
      ...baseOptions,
      trembitaHeader: {
        service: { soapAction: "", serviceCode: "PostPetition" },
      },
    };
    const provider = new XroadProvider(context, options);

    await expect(provider.send(buildData())).rejects.toThrow(
      "Trembita provider. Service soap action not defined.",
    );
  });
});
