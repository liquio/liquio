const uploadScript = async (link) => {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = link;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

export default uploadScript;
