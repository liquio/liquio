const cyrillicLetters = (message: string): boolean =>
  /^[АаБбВвГгҐґДдЕеЄєЖжЗзИиІіЇїЙйКкЛлМмНнОоПпРрСсТтУуФфХхЦцЧчШшЩщЬьЮюЯя]+$/.test(message);

const isCyrillic = (message: string): boolean =>
  /^[-'‘’,.№"(): АаБбВвГгҐґДдЕеЄєЖжЗзИиІіЇїЙйКкЛлМмНнОоПпРрСсТтУуФфХхЦцЧчШшЩщЬьЮюЯя0-9]+$/.test(message);

export { cyrillicLetters };

export default isCyrillic;
