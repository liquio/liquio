import { performance, PerformanceObserver } from 'node:perf_hooks';
import { getTraceId } from './async_local_storage';

// Init new observer instance.
const performanceObserver = new PerformanceObserver((items) => {
  items.getEntries().forEach((entry: any) => {
    if (entry.duration > (global.config?.performance_observer?.maxDuration || 10000)) {
      global.log.save('performance-measure-warning', { ...entry.detail, duration: entry.duration }, 'warning');
    }
  });
});

// Start to observing measure types.
performanceObserver.observe({ entryTypes: [ 'measure' ], buffered: true });

/**
 * @param {object} req HTTP request.
 * @param {object} res HTTP response.
 * @param {object} next Next request handler.
 */
export const performanceMeasureMiddleware = (req, res, next) => {
  performance.mark(`${getTraceId()}-start`);

  res.on('finish', () => {
    if (!getTraceId()) {
      performance.clearMarks();
      return;
    }

    performance.mark(`${getTraceId()}-end`);

    // Create measure.
    performance.measure(getTraceId(), {
      start: `${getTraceId()}-start`,
      end: `${getTraceId()}-end`,
      detail: {
        method: req.method,
        url: req.url,
        headers: req.headers,
        userIp: { remoteAddress: req.connection.remoteAddress, xForwardedFor: req.headers['x-forwarded-for'] || null },
        body: req.body
      }
    });
  });

  next();
};

