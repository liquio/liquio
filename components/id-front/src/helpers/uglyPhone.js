export default (phone) => '+' + phone.substring(0, 5) + '*'.repeat(phone.length - 7) + phone.slice(-2);
