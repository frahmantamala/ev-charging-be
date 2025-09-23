// runs after jest environment is set up
// clear eventBus observers after each test to avoid lingering subscriptions

afterEach(() => {
  try {
    const ebMod = require('../src/core/events/event-bus');
    const eb = ebMod.eventBus;
    if (eb && typeof eb.complete === 'function') {
      try { eb.complete(); } catch (e) {}
    }
    // replace with a fresh Subject so subsequent tests get a clean bus
    try {
      const { Subject } = require('rxjs');
      ebMod.eventBus = new Subject();
    } catch (e) {
      // ignore
    }
  } catch (err) {
    // ignore
  }
});
