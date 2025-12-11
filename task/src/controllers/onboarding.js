const AuthService = require('../services/auth');
const Controller = require('./controller');
const RedisClient = require('../lib/redis_client');
const Helpers = require('../lib/helpers');

class OnboardingController extends Controller {
  static instance;

  constructor(config) {
    if (!OnboardingController.instance) {
      super(config);
      this.auth = new AuthService().provider;

      this.redisClient = config?.redis?.isEnabled ? new RedisClient({
        host: config.redis.host,
        port: config.redis.port,
        defaultTtl: config.redis.defaultTtl
      }) : undefined;

      OnboardingController.instance = this;
    }
    return OnboardingController.instance;
  }

  async execute(req, res) {
    try {
      await this.executeDefaultOnboarding(req, res);
      await this.executeAdditionalOnboarding(req, res);
    } catch (error) {
      log.save('onboarding-execution-error', { error: error.message });
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

  async markUserOnboardingDone(userId, task) {
    const userUnitIds = Helpers.getUserUnits(userId);
    const [userInfo] = await this.auth.getUsersByIds([userId], true);
    const additionalOnboarding = this.config?.onboarding?.additionalOnboardingTemplates || [];

    const onboardingIndex = additionalOnboarding.findIndex(({ taskTemplateId }) => taskTemplateId === task.taskTemplateId);

    if (additionalOnboarding[onboardingIndex]) {
      const { handler, handlerOptions } = additionalOnboarding[onboardingIndex];
      if (typeof this[handler] === 'function') {
        const check = await this[handler]({
          userId,
          authUserInfo: userInfo,
        }, null, handlerOptions);
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

          log.save('onboarding-next-task', nextTaskData);
          const task = await businesses.task.create(nextTaskData);
          if (task) {
            return this.auth.updateUserOnboarding(userId, { onboardingTaskId: task.id, needOnboarding: true });
          }
        }
      }
      nextOnboardingIndex++;
    }

    return this.auth.updateUserOnboarding(userId, { onboardingTaskId: '', needOnboarding: false });
  }

  async executeOnboarding(req, res, workflowTemplateId, taskTemplateId) {
    try {
      const onboardingConfig = this.config?.onboarding;
      const userInfo = req.authUserInfo;
      const { onboardingTaskId, needOnboarding } = userInfo;
      const userId = this.getRequestUserId(req);

      if (onboardingTaskId) {
        const onboardingTask = await models.task.findById(onboardingTaskId).catch(() => null);

        if (onboardingTask?.finished) {
          if ([onboardingConfig.onboardingTemplate.taskTemplateId].includes(onboardingTask.taskTemplateId)) {
            await this.auth.updateUserOnboarding(userId, { onboardingTaskId: '' });
          }
        } else if (onboardingTask) {
          res.header('onboarding-task-id', onboardingTaskId);
          return;
        }
      }

      if (needOnboarding || onboardingTaskId) {
        const task = await this.createOnboardingTask(req, userId, workflowTemplateId, taskTemplateId);
        if (task) {
          await this.auth.updateUserOnboarding(userId, { onboardingTaskId: task.id, needOnboarding: true });
          req.authUserInfo.onboardingTaskId = task.id;
          res.header('onboarding-task-id', task.id);
        }
      }
    } catch (error) {
      log.save('onboarding-execution-error', { error: error.message });
    }
  }

  async createOnboardingTask(req, userId, workflowTemplateId, taskTemplateId) {
    const userInfo = req.authUserInfo;
    const oauthToken = this.getRequestUserAccessToken(req);
    const unitIds = this.getRequestUserUnitIds(req);

    return businesses.task.create({
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

    const registerResponse = await businesses.register.getRecordsByKeyIdFullAccess(keyId, {
      data: {
        [property]: edrpou,
      }
    });
    const { data: [record] } = registerResponse;

    if (this.redisClient) {
      this.redisClient.set(cacheKey, JSON.stringify({ recordExisted: !!record }), 60);
    }

    return !record;
  }
}

module.exports = OnboardingController;
