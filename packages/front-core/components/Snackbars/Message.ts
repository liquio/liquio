class Message {
  message: string;
  variant: string;
  details?: unknown;
  data: Record<string, unknown> | false;
  onCloseCallBack?: () => void;

  constructor(
    message: string,
    variant = 'error',
    details?: unknown,
    data: Record<string, unknown> | false = {},
    onCloseCallBack?: () => void,
  ) {
    this.message = message;
    this.variant = variant;
    this.details = details;
    this.data = data;
    this.onCloseCallBack = onCloseCallBack;
  }
}

export default Message;
