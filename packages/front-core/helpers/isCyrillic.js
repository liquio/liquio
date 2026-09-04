const cyrillicLetters = (message) =>
  /^[АаБбВвГгҐґДдЕеЄєЖжЗзИиІіЇїЙйКкЛлМмНнОоПпРрСсТтУуФфХхЦцЧчШшЩщЬьЮюЯя]+$/.test(
    message,
  );

const isCyrillic = (message) =>
  /^[-'‘’,.№"(): АаБбВвГгҐґДдЕеЄєЖжЗзИиІіЇїЙйКкЛлМмНнОоПпРрСсТтУуФфХхЦцЧчШшЩщЬьЮюЯя0-9]+$/.test(
    message,
  );

export { cyrillicLetters };

export default isCyrillic;
