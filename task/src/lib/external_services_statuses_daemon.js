const DEFAULT_INTERVAL_IN_MINUTES = 15;
const DEFAULT_PART_SIZE = 10;


class ExternalServicesStatusesDaemon {
  constructor(config) {
    if (!ExternalServicesStatusesDaemon.singleton) {
      this.intervalInMinutes = config?.intervalInMinutes || DEFAULT_INTERVAL_IN_MINUTES;
      this.intervalInMilliseconds = this.intervalInMinutes * 60 * 1000;
      this.partSize = config?.partSize || DEFAULT_PART_SIZE;

      ExternalServicesStatusesDaemon.singleton = this;
    }
    return ExternalServicesStatusesDaemon.singleton;
  }

  /**
   * @return {Promise<void>}
   */
  async start() {
    setInterval(async () => {
      log.save('external-services-statuses-daemon|run');

      // Set received state to statuses who are stuck in pending state. Example: if within 15 minutes status has not to been processed
      await global.models.externalServicesStatuses.setReceivedState(this.intervalInMinutes);

      const statusesWithReceivedState = await global.models.externalServicesStatuses.getWithReceivedState(this.partSize);

      if (!statusesWithReceivedState.length) {
        log.save('external-services-status-daemon|skip', { reason: 'No statuses with received state.' });
        return;
      }

      const handleResults = await Promise.allSettled(statusesWithReceivedState.map(async (status) => {
        const serviceHandler = await global.businesses.externalServices.servicesHandlers[status.service]?.bind(global.businesses);
        if (!serviceHandler) {
          throw new Error(`Invalid status service name: ${status.service}`);
        }
        return await serviceHandler(status);
      }));

      const fulfilledStatuses = [];
      const rejectedStatuses = [];
      handleResults.map((v, i) => {
        if (v.status === 'fulfilled') {
          fulfilledStatuses.push(statusesWithReceivedState[i].id);
        }
        if (v.status === 'rejected') {
          rejectedStatuses.push({
            id: statusesWithReceivedState[i].id,
            rejectedReason: `Error: ${v.reason.toString()}. Cause: ${JSON.stringify(v.reason.cause || null)}`,
          });
        }
      });

      if (fulfilledStatuses.length) {
        await global.models.externalServicesStatuses.setFulfilledState(fulfilledStatuses);
      }
      if (rejectedStatuses.length) {
        await global.models.externalServicesStatuses.setRejectedState(rejectedStatuses);
      }

      log.save('external-services-statuses-daemon|end', {
        fulfilledStatuses: fulfilledStatuses.length,
        rejectedStatuses: rejectedStatuses.length
      });

    }, this.intervalInMilliseconds);
  }
}

module.exports = ExternalServicesStatusesDaemon;
