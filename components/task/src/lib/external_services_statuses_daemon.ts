import { getBusinesses, getLog, getModels } from './context';

const DEFAULT_INTERVAL_IN_MINUTES = 15;
const DEFAULT_PART_SIZE = 10;

export class ExternalServicesStatusesDaemon {
  private static singleton: ExternalServicesStatusesDaemon;

  intervalInMilliseconds: any;
  intervalInMinutes: any;
  partSize: any;

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
      getLog().save('external-services-statuses-daemon|run');

      // Set received state to statuses who are stuck in pending state. Example: if within 15 minutes status has not to been processed
      await getModels().externalServicesStatuses.setReceivedState(this.intervalInMinutes);

      const statusesWithReceivedState = await getModels().externalServicesStatuses.getWithReceivedState(this.partSize);

      if (!statusesWithReceivedState.length) {
        getLog().save('external-services-status-daemon|skip', { reason: 'No statuses with received state.' });
        return;
      }

      const handleResults = await Promise.allSettled(
        statusesWithReceivedState.map(async (status) => {
          const serviceHandler = await getBusinesses().externalServices.servicesHandlers[status.service]?.bind(getBusinesses());
          if (!serviceHandler) {
            throw new Error(`Invalid status service name: ${status.service}`);
          }
          return await serviceHandler(status);
        }),
      );

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
        await getModels().externalServicesStatuses.setFulfilledState(fulfilledStatuses);
      }
      if (rejectedStatuses.length) {
        await getModels().externalServicesStatuses.setRejectedState(rejectedStatuses);
      }

      getLog().save('external-services-statuses-daemon|end', {
        fulfilledStatuses: fulfilledStatuses.length,
        rejectedStatuses: rejectedStatuses.length,
      });
    }, this.intervalInMilliseconds);
  }
}
