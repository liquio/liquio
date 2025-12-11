class ChangeEvent {
  data = null;
  force = false;
  hard = false;
  busyOnload = false;

  constructor(data, force = false, hard = false, busyOnload = false) {
    this.data = data;
    this.force = force;
    this.hard = hard;
    this.busyOnload = busyOnload;
  }
}

export default ChangeEvent;
