import axios from 'axios';

async function test() {
  try {
    const locRes = await axios.get('http://localhost:5000/api/locations/active');
    const locations = locRes.data;
    const selectedLoc = locations[0];
    
    console.log("Logging in with location:", selectedLoc.city);

    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'zudo.superadmin@gmail.com',
      password: 'Zudo@12345',
      locationId: selectedLoc._id,
      targetSegment: 'Both'
    });
    
    const token = loginRes.data.token;
    console.log("Token received");

    const headers = {
      'Authorization': `Bearer ${token}`,
      'x-location': selectedLoc._id
    };

    const endpoints = [
      '/products',
      '/categories',
      '/drivers',
      '/orders/admin/all',
      '/sellers',
      '/locations'
    ];

    for (const ep of endpoints) {
      try {
        const res = await axios.get(`http://localhost:5000/api${ep}`, { headers });
        console.log(`Success ${ep}:`, res.data);
      } catch (err) {
        console.error(`Error ${ep}:`, err.response?.status, err.response?.data?.message || err.message);
      }
    }
  } catch (err) {
    console.error("Login/Setup Error:", err.response?.data || err.message);
  }
}

test();
