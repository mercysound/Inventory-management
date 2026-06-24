import EventEmitter from 'events';

// Dedicated emitter for product-level changes so product SSE streams
// stay independent from order SSE streams.
class ProductNotifier extends EventEmitter {}

const productNotifier = new ProductNotifier();
productNotifier.setMaxListeners(200); // support many concurrent browser tabs

export default productNotifier;
