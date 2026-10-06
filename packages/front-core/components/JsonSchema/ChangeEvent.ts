class ChangeEvent<T = unknown> {
  data: T;
  force = false;
  hard = false;
  busyOnload = false;

  constructor(data: T, force = false, hard = false, busyOnload = false) {
    this.data = data;
    this.force = force;
    this.hard = hard;
    this.busyOnload = busyOnload;
  }
}

export default ChangeEvent;
