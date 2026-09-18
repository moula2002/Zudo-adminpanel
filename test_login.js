import axios from 'axios';

async function test() {
  try {
    // 1. Get locations
    const locRes = await axios.get('https://lightgreen-trout-176417.hostingersite.com/api/locations/active');
    const locations = locRes.data;
    console.log("Locations:", locations.map(l => l.city));

    const selectedLoc = locations[0]; // let's pick first
    console.log("Selected Location ID:", selectedLoc._id);

    // 2. Login
    const loginRes = await axios.post('https://lightgreen-trout-176417.hostingersite.com/api/auth/login', {
      email: 'zudo.superadmin@gmail.com',
      password: 'Zudo@12345',
      locationId: selectedLoc._id,
      targetSegment: 'Both'
    });
    
    console.log("Login token received");
    const token = loginRes.data.token;

    // 3. Fetch data e.g. dashboard stats
    const productsRes = await axios.get('https://lightgreen-trout-176417.hostingersite.com/api/products', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-location': selectedLoc._id
      }
    });

    console.log("Products Count:", productsRes.data.length);
  } catch (err) {
    console.error("Error:", err.response ? err.response.data : err.message);
  }
}

test();
