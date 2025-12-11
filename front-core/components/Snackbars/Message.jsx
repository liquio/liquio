class Message {
  constructor(message, variant = 'error', details, data = {}, onCloseCallBack) {
    this.message = message;
    this.variant = variant;
    this.details = details;
    this.data = data;
    this.onCloseCallBack = onCloseCallBack;
  }
}

export default Message;
