import { getIdApiClient, IdApiClient, IdApiError } from '@liquio/back-core';

import { Controller } from './controller';
import { RedisClient } from '../lib/redis_client';
import { Helpers } from '../lib/helpers';

export class OnboardingController extends Controller {
  idApiClient: IdApiClient;
  redisClient: any;

  static instance;

  constructor(config) {
    if (!OnboardingController.instance) {
      super(config);
      this.idApiClient = getIdApiClient();

      this.redisClient = config?.redis?.isEnabled
        ? new RedisClient({
            host: config.redis.host,
            port: config.redis.port,
            defaultTtl: config.redis.defaultTtl,
          })
        : undefined;

      OnboardingController.instance = this;
    }
    return OnboardingController.instance;
  }

  async execute(req, res) {
    try {
      await this.executeDefaultOnboarding(req, res);
      await this.executeAdditionalOnboarding(req, res);
    } catch (error) {
      global.log.save('onboarding-execution-error', { error: error.message });
    }
  }

  async executeAdditionalOnboarding(req, res) {
    const additionalOnboarding = this.config?.onboarding?.additionalOnboardingTemplates || [];

    for (const { handler, handlerOptions, workflowTemplateId, taskTemplateId } of additionalOnboarding) {
      if (typeof this[handler] === 'function') {
        const check = await this[handler](req, res, handlerOptions);
        if (check) {
          req.authUserInfo.needOnboarding = true;
          return this.executeOnboarding(req, res, workflowTemplateId, taskTemplateId);
        }
      }
    }
  }

  async executeDefaultOnboarding(req, res) {
    const onboardingConfig = this.config?.onboarding;

    const { workflowTemplateId, taskTemplateId } = onboardingConfig?.onboardingTemplate || {};

    if (workflowTemplateId && taskTemplateId) {
      await this.executeOnboarding(req, res, workflowTemplateId, taskTemplateId);
    }
  }

  /**
   * Update user onboarding in id-api. An id-api error response is only logged, as before: the callers
   * (task finish) must not fail because of it. Network errors and timeouts are thrown.
   * @param {string} userId User ID.
   * @param {object} params Params.
   * @param {string} params.onboardingTaskId Onboarding task ID.
   * @param {boolean} [params.needOnboarding] Need onboarding indicator.
   */
  async updateUserOnboarding(userId, params: { onboardingTaskId: string; needOnboarding?: boolean }) {
    try {
      await this.idApiClient.updateUserOnboarding(userId, params as { onboardingTaskId: string; needOnboarding: boolean });
    } catch (error) {
      if (!(error instanceof IdApiError) || error.code !== 'HTTP_ERROR') {
        throw error;
      }
      global.log.save('update-user-onboarding-error', { userId, status: error.status, error: error.message }, 'error');
    }
  }

  async markUserOnboardingDone(userId, task) {
    const userUnitIds = Helpers.getUserUnits(userId);
    const [userInfo] = await this.idApiClient.getUsersByIds([userId], { withPrivateProps: true });
    const additionalOnboarding = this.config?.onboarding?.additionalOnboardingTemplates || [];

    const onboardingIndex = additionalOnboarding.findIndex(({ taskTemplateId }) => taskTemplateId === task.taskTemplateId);

    if (additionalOnboarding[onboardingIndex]) {
      const { handler, handlerOptions } = additionalOnboarding[onboardingIndex];
      if (typeof this[handler] === 'function') {
        const check = await this[handler](
          {
            userId,
            authUserInfo: userInfo,
          },
          null,
          handlerOptions,
        );
        if (check) {
          // if onboarding still needed or waiting for some conditions
          // do nothing
          return;
        }
      }
    }

    let nextOnboardingIndex = onboardingIndex + 1;

    while (nextOnboardingIndex < additionalOnboarding.length) {
      const { handler, handlerOptions, workflowTemplateId, taskTemplateId } = additionalOnboarding[nextOnboardingIndex];
      if (typeof this[handler] === 'function') {
        const check = await this[handler]({ authUserInfo: userInfo, userUnitIds }, null, handlerOptions);
        if (check) {
          const nextTaskData = {
            workflowTemplateId,
            taskTemplateId,
            userInfo,
            userId,
            unitIds: userUnitIds,
          };

          global.log.save('onboarding-next-task', nextTaskData);
          const task = await global.businesses.task.create(nextTaskData);
          if (task) {
            return this.updateUserOnboarding(userId, { onboardingTaskId: task.id, needOnboarding: true });
          }
        }
      }
      nextOnboardingIndex++;
    }

    return this.updateUserOnboarding(userId, { onboardingTaskId: '', needOnboarding: false });
  }

  async executeOnboarding(req, res, workflowTemplateId, taskTemplateId) {
    try {
      const onboardingConfig = this.config?.onboarding;
      const userInfo = req.authUserInfo;
      const { onboardingTaskId, needOnboarding } = userInfo;
      const userId = this.getRequestUserId(req);

      if (onboardingTaskId) {
        const onboardingTask = await global.models.task.findById(onboardingTaskId).catch(() => null);

        if (onboardingTask?.finished) {
          if ([onboardingConfig.onboardingTemplate.taskTemplateId].includes(onboardingTask.taskTemplateId)) {
            await this.updateUserOnboarding(userId, { onboardingTaskId: '' });
          }
        } else if (onboardingTask) {
          res.header('onboarding-task-id', onboardingTaskId);
          return;
        }
      }

      if (needOnboarding || onboardingTaskId) {
        const task = await this.createOnboardingTask(req, userId, workflowTemplateId, taskTemplateId);
        if (task) {
          await this.updateUserOnboarding(userId, { onboardingTaskId: task.id, needOnboarding: true });
          req.authUserInfo.onboardingTaskId = task.id;
          res.header('onboarding-task-id', task.id);
        }
      }
    } catch (error) {
      global.log.save('onboarding-execution-error', { error: error.message });
    }
  }

  async createOnboardingTask(req, userId, workflowTemplateId, taskTemplateId) {
    const userInfo = req.authUserInfo;
    const oauthToken = this.getRequestUserAccessToken(req);
    const unitIds = this.getRequestUserUnitIds(req);

    return global.businesses.task.create({
      workflowTemplateId,
      taskTemplateId,
      userInfo,
      userId,
      oauthToken,
      unitIds,
    });
  }

  async edrpouExistsInRegister(req, res, options) {
    const { keyId, property } = options;
    if (!keyId || !property) return;

    const userInfo = req.authUserInfo;
    const { edrpou } = userInfo;

    if (!edrpou) return;

    const cacheKey = `onboarding-additional-edrpou-${edrpou}`;
    if (this.redisClient) {
      const result = await this.redisClient.get(cacheKey);
      if (result) {
        return !JSON.parse(result).recordExisted;
      }
    }

    const registerResponse: any = await global.businesses.register.getRecordsByKeyIdFullAccess(keyId, {
      data: {
        [property]: edrpou,
      },
    });
    const {
      data: [record],
    } = registerResponse;

    if (this.redisClient) {
      this.redisClient.set(cacheKey, JSON.stringify({ recordExisted: !!record }), 60);
    }

    return !record;
  }
}
