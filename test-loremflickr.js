async function testLoremFlickr() {
  try {
    const url = 'https://loremflickr.com/1080/1920/coffee,shop';
    console.log('Fetching LoremFlickr:', url);
    const response = await fetch(url, { method: 'HEAD' });
    console.log('Status:', response.status);
    console.log('Redirected to:', response.url);
  } catch (err) {
    console.error('LoremFlickr fetch failed:', err);
  }
}
testLoremFlickr();
