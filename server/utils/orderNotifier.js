import EventEmitter from 'events';

class OrderNotifier extends EventEmitter {}

const orderNotifier = new OrderNotifier();

export default orderNotifier;
