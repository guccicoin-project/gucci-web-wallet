"use strict";

module.exports.isHex = (input) => {
  const re = /[0-9A-Fa-f]{6}/g;
  return re.test(input);
};

module.exports.validAddress = (addr) => (addr.length === 101 || addr.length === 189) && addr.substring(0, 5) === "gucci";

module.exports.validAmount = (amt, bal) => (amt < bal) && (amt > 0);

module.exports.validFee = (fee, amt, bal) => ((amt + fee) < bal) && (fee >= 0.1);

module.exports.validId = (id) => id === "" || (id.length === 64 && this.isHex(id));
