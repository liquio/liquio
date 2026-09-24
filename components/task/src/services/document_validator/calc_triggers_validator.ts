import _ from 'lodash';
import * as crypto from 'node:crypto';
import PropByPath from 'prop-by-path';

import { Sandbox } from '@liquio/back-core';

import { JSONPath } from '../../lib/jsonpath';
import { Paths } from './paths';

// Constants.
const MISMATCH_LOG_TYPE = 'calc-triggers-validation-mismatch';

export type CalcTriggerError = { dataPath: string; validationParam: undefined; message: string };

/**
 * Validates that calcTrigger-calculated fields weren't tampered with client-side, by recomputing
 * `calculate` server-side. Covers `source` (incl. `${index}`-templated), `step`, `callBeforePdf`
 * and silent triggers. Not covered: `action`-based triggers (can't be recomputed synchronously).
 * Opt-in per trigger via `validate: true` - a trigger with `validate` unset or `false` is skipped.
 */
export class CalcTriggersValidator {
  jsonSchema: any;
  sandbox: any;
  userInfo: any;

  /**
   * @param {object} jsonSchema JSON schema.
   * @param {object} userInfo User info.
   */
  constructor(jsonSchema, userInfo) {
    this.jsonSchema = jsonSchema;
    this.userInfo = userInfo;
    this.sandbox = Sandbox.getInstance();
  }

  /**
   * Check calcTriggers weren't tampered with client-side. Applies regardless of `readOnly`.
   * Only triggers with `validate: true` are checked - `validate: false` or unset is skipped.
   * @param {object} objectToCheck Object to check.
   * @param {string[]} [targetPaths] When given, only recompute triggers whose `target` (accounting
   * for `${index}` placeholders) is one of these paths or has one of them under it (e.g. the leaf
   * sub-path `result.name` of an object target `result`) - the rest are skipped without ever
   * running their `calculate`/visibility functions.
   * @returns {Promise<CalcTriggerError[]>}
   */
  async check(objectToCheck, targetPaths?: string[]): Promise<CalcTriggerError[]> {
    // Errors container.
    const errors: CalcTriggerError[] = [];

    const calcTriggers = this.jsonSchema?.calcTriggers || [];
    for (const trigger of calcTriggers) {
      if (!trigger.target || !trigger.calculate || trigger.action || trigger.validate !== true) {
        continue;
      }

      if (targetPaths && !targetPaths.some((path) => Paths.matchesTemplateOrDescendant(trigger.target, path))) {
        continue;
      }

      try {
        if (trigger.source) {
          const sourcePaths = Array.isArray(trigger.source) ? trigger.source : [trigger.source];

          if (sourcePaths.some((sourcePath) => sourcePath.includes('${index}')) || trigger.target.includes('${index}')) {
            // `${index}`-templated source/target - one concrete check per current array item.
            await this.checkIndexedCalcTrigger(trigger, sourcePaths, objectToCheck, errors);
            continue;
          }

          // Skip if every source field is hidden or on a hidden step - nothing to enforce.
          if (!sourcePaths.some((sourcePath) => this.isSourcePathVisible(sourcePath, objectToCheck))) {
            continue;
          }

          const [firstSourcePath] = sourcePaths;
          const sourceValue = PropByPath.get(objectToCheck, firstSourcePath);
          const [stepName] = firstSourcePath.split('.');
          const stepData = PropByPath.get(objectToCheck, stepName);
          await this.checkCalcTriggerValue(trigger, objectToCheck, sourceValue, stepData, errors);
        } else if (typeof trigger.callBeforePdf !== 'undefined') {
          // Fires right before PDF generation - check it whenever PDF is required for this document.
          if (!this.isPdfRequired(objectToCheck) || !this.isCallBeforePdf(trigger, objectToCheck)) {
            continue;
          }

          await this.checkCalcTriggerValue(trigger, objectToCheck, undefined, undefined, errors);
        } else if (trigger.step) {
          // Step-type trigger - check only if the step it fires after was shown to the user.
          const stepNames = Array.isArray(trigger.step) ? trigger.step : [trigger.step];
          if (!stepNames.some((stepName) => this.isStepVisible(stepName, objectToCheck))) {
            continue;
          }

          const [firstStepName] = stepNames;
          const stepData = PropByPath.get(objectToCheck, firstStepName);
          await this.checkCalcTriggerValue(trigger, objectToCheck, undefined, stepData, errors);
        } else if (this.countVisibleSteps(objectToCheck) >= 1) {
          // Silent trigger - fires after every step except the last, so only enforceable
          // when at least one (non-last) step is currently visible to the user.
          await this.checkCalcTriggerValue(trigger, objectToCheck, undefined, undefined, errors);
        }
      } catch (error) {
        global.log.save('json-schema-validation-exception|check-calc-triggers', { error: error.message, target: trigger.target }, 'warn');
      }
    }

    // Return collected errors.
    return errors;
  }

  /**
   * Recompute a calcTrigger's expected value and push an error if it doesn't match the stored one.
   * Every mismatch is also logged with a dedicated log type (paths only, never the values).
   * @param {object} trigger CalcTrigger definition.
   * @param {object} objectToCheck Object to check.
   * @param {any} sourceValue Value of the field that triggered the recalculation, if any.
   * @param {object} stepData Data of the step the source field belongs to, if any.
   * @param {CalcTriggerError[]} errors Errors accumulator.
   * @returns {Promise<void>}
   */
  private async checkCalcTriggerValue(trigger, objectToCheck, sourceValue, stepData, errors: CalcTriggerError[]): Promise<void> {
    const targetParentPath = trigger.target.split('.').slice(0, -1).join('.');
    const parentData = targetParentPath ? PropByPath.get(objectToCheck, targetParentPath) : objectToCheck;

    let expectedValue = await this.sandbox.evalWithArgs(trigger.calculate, [sourceValue, stepData, objectToCheck, parentData, this.userInfo], {
      meta: { fn: 'CalcTriggersValidator.checkCalcTriggers', target: trigger.target },
    });

    if (trigger.useSha256) {
      expectedValue = crypto.createHash('sha256').update(String(expectedValue)).digest('hex');
    }

    const actualValue = PropByPath.get(objectToCheck, trigger.target);
    if (!_.isEqual(actualValue, expectedValue)) {
      const context = trigger.source ? ` (source: ${trigger.source})` : trigger.step ? ` (step: ${trigger.step})` : '';
      errors.push({
        dataPath: trigger.target,
        validationParam: undefined,
        message: `calcTrigger recalculation mismatch${context}`,
      });

      global.log.save(
        MISMATCH_LOG_TYPE,
        {
          target: trigger.target,
          ...(trigger.source && { source: trigger.source }),
          ...(trigger.step && { step: trigger.step }),
          ...(typeof trigger.callBeforePdf !== 'undefined' && { callBeforePdf: trigger.callBeforePdf }),
        },
        'warn',
      );
    }
  }

  /**
   * Check a source-type calcTrigger whose `source`/`target` reference an array item via a
   * `${index}` placeholder - one concrete check per current item of the referenced array.
   * @param {object} trigger CalcTrigger definition.
   * @param {string[]} sourcePaths `trigger.source`, normalized to an array.
   * @param {object} objectToCheck Object to check.
   * @param {CalcTriggerError[]} errors Errors accumulator.
   * @returns {Promise<void>}
   */
  private async checkIndexedCalcTrigger(trigger, sourcePaths: string[], objectToCheck, errors: CalcTriggerError[]): Promise<void> {
    const [indexedPathTemplate] = [...sourcePaths, trigger.target].filter((path) => path.includes('${index}'));
    const arrayPath = indexedPathTemplate.split('.${index}')[0];
    const arrayValue = PropByPath.get(objectToCheck, arrayPath);
    if (!Array.isArray(arrayValue)) {
      return;
    }

    for (let index = 0; index < arrayValue.length; index++) {
      const indexedSourcePaths = sourcePaths.map((sourcePath) => sourcePath.replace('${index}', `${index}`));
      if (!indexedSourcePaths.some((sourcePath) => this.isSourcePathVisible(sourcePath, objectToCheck))) {
        continue;
      }

      const [firstIndexedSourcePath] = indexedSourcePaths;
      const sourceValue = PropByPath.get(objectToCheck, firstIndexedSourcePath);
      const [stepName] = firstIndexedSourcePath.split('.');
      const stepData = PropByPath.get(objectToCheck, stepName);
      const indexedTrigger = {
        ...trigger,
        source: indexedSourcePaths.length > 1 ? indexedSourcePaths : firstIndexedSourcePath,
        target: trigger.target.replace('${index}', `${index}`),
      };

      await this.checkCalcTriggerValue(indexedTrigger, objectToCheck, sourceValue, stepData, errors);
    }
  }

  /**
   * Is PDF generation required for this document, per its `pdfRequired` schema attribute.
   * @param {object} objectToCheck Object to check.
   * @returns {boolean}
   */
  private isPdfRequired(objectToCheck): boolean {
    return (
      this.sandbox.evalWithArgs(this.jsonSchema?.pdfRequired ?? false, [objectToCheck], {
        checkArrow: true,
        meta: { fn: 'CalcTriggersValidator.isPdfRequired' },
      }) === true
    );
  }

  /**
   * Is a calcTrigger's `callBeforePdf` attribute (bool or function) currently true.
   * @param {object} trigger CalcTrigger definition.
   * @param {object} objectToCheck Object to check.
   * @returns {boolean}
   */
  private isCallBeforePdf(trigger, objectToCheck): boolean {
    return (
      this.sandbox.evalWithArgs(trigger.callBeforePdf ?? false, [objectToCheck], {
        checkArrow: true,
        meta: { fn: 'CalcTriggersValidator.isCallBeforePdf', target: trigger.target },
      }) === true
    );
  }

  /**
   * Count visible steps, excluding whichever visible step is last - a silent trigger never fires
   * after the step the user actually finishes on.
   * @param {object} objectToCheck Object to check.
   * @returns {number}
   */
  private countVisibleSteps(objectToCheck): number {
    const stepNames = Object.keys(this.jsonSchema?.properties || {});
    const visibleStepNames = stepNames.filter((stepName) => this.isStepVisible(stepName, objectToCheck));
    return Math.max(visibleStepNames.length - 1, 0);
  }

  /**
   * Is calcTrigger source path currently visible (not hidden, and its step not hidden).
   * @param {string} sourcePath Source path.
   * @param {object} objectToCheck Object to check.
   * @returns {boolean}
   */
  private isSourcePathVisible(sourcePath: string, objectToCheck): boolean {
    const [stepName] = sourcePath.split('.');
    if (!this.isStepVisible(stepName, objectToCheck)) {
      return false;
    }

    return !this.isCurrentOrParentsControlHidden(sourcePath, objectToCheck);
  }

  /**
   * Is a path (or an ancestor of it) hidden, via either `hidden` or `checkHidden`.
   * @param {string} path Dotted document data path.
   * @param {object} objectToCheck Object to check.
   * @returns {boolean}
   */
  private isCurrentOrParentsControlHidden(path: string, objectToCheck): boolean {
    const pathItems = path.split('.');

    for (let p = 0; p < pathItems.length; p++) {
      const propertyValuePath = p ? pathItems.slice(0, -p).join('.') : path;

      const propertySchemaPathTemplate = `$..${propertyValuePath
        .replace(/\[\w+\]/g, '.')
        .replace(/\.\./g, '.')
        .replace(/\.$/g, '')
        .replace(/\./g, '..')}`;
      const [propertyValueSchema] = JSONPath({ path: propertySchemaPathTemplate, json: this.jsonSchema });

      if (typeof propertyValueSchema !== 'object' || propertyValueSchema === null) {
        continue;
      }

      const propertyPathItems = propertyValuePath.split('.');
      const parentPath = propertyPathItems.slice(0, -1).join('.');
      const value = PropByPath.get(objectToCheck, propertyValuePath);
      const parentValue = PropByPath.get(objectToCheck, parentPath);

      if (
        this.sandbox.evalWithArgs(propertyValueSchema.hidden ?? false, [objectToCheck, value, parentValue, this.userInfo], {
          checkArrow: true,
          meta: { fn: 'CalcTriggersValidator.isCurrentOrParentsControlHidden', attr: 'hidden', valuePath: propertyValuePath },
        }) === true
      ) {
        return true;
      }

      if (
        this.sandbox.evalWithArgs(propertyValueSchema.checkHidden ?? false, [value, parentValue, this.userInfo], {
          checkArrow: true,
          meta: { fn: 'CalcTriggersValidator.isCurrentOrParentsControlHidden', attr: 'checkHidden', valuePath: propertyValuePath },
        }) === true
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Is step hidden via its `checkStepHidden` schema attribute.
   * @param {string} stepName Step (top-level property) name.
   * @param {object} objectToCheck Object to check.
   * @returns {boolean}
   */
  private isStepHidden(stepName: string, objectToCheck): boolean {
    const stepSchema = this.jsonSchema?.properties?.[stepName];
    if (!stepSchema) {
      return false;
    }

    return (
      this.sandbox.evalWithArgs(stepSchema.checkStepHidden ?? false, [objectToCheck, this.userInfo], {
        checkArrow: true,
        meta: { fn: 'CalcTriggersValidator.checkStepHidden', path: stepName },
      }) === true
    );
  }

  /**
   * Is a step visible - either its own `checkStepHidden` says it isn't hidden, or it's listed in
   * `stepOrders` (whichever attribute is present decides; a step with neither defaults to visible).
   * @param {string} stepName Step (top-level property) name.
   * @param {object} objectToCheck Object to check.
   * @returns {boolean}
   */
  private isStepVisible(stepName: string, objectToCheck): boolean {
    const hasCheckStepHidden = typeof this.jsonSchema?.properties?.[stepName]?.checkStepHidden !== 'undefined';
    const stepOrdersDefined = typeof this.jsonSchema?.stepOrders !== 'undefined';

    if (hasCheckStepHidden && !this.isStepHidden(stepName, objectToCheck)) {
      return true;
    }

    if (!hasCheckStepHidden && !stepOrdersDefined) {
      return true;
    }

    return this.getStepOrders(objectToCheck).includes(stepName);
  }

  /**
   * Get the schema's `stepOrders` attribute (array, or a function returning one) as an array.
   * @param {object} objectToCheck Object to check.
   * @returns {string[]}
   */
  private getStepOrders(objectToCheck): string[] {
    const stepOrders = this.jsonSchema?.stepOrders;

    if (Array.isArray(stepOrders)) {
      return stepOrders;
    }

    if (typeof stepOrders === 'string') {
      try {
        const result = this.sandbox.evalWithArgs(stepOrders, [objectToCheck, this.userInfo], {
          meta: { fn: 'CalcTriggersValidator.getStepOrders' },
        });
        return Array.isArray(result) ? result : [];
      } catch (error) {
        global.log.save('json-schema-validation-exception', error.message, 'warn');
        return [];
      }
    }

    return [];
  }
}
