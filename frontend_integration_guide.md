# Frontend Integration: Displaying Matches

To display matches on your frontend, you don't need complex queries. We have a single optimized function: `get_user_rides(user_id)`.

This database function returns everything a user needs to see:
1.  **Hosting Info**: Their active Ride Templates (if they are a host).
2.  **Riding Info**: Their active Ride Requests (if they are a rider).
3.  **Pending Matches**: Any matches waiting for their action (or waiting for the other party).

## 1. Fetching the Data

In your frontend code (React/Vue/Svelte/Next.js), use the Supabase JS client to call this function.

```javascript
// Example using Supabase Client
async function fetchDashboardData() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data, error } = await supabase
    .rpc('get_user_rides', { 
      user_id: user.id 
    });

  if (error) {
    console.error('Error fetching dashboard:', error);
    return null;
  }

  return data;
}
```

## 2. Data Structure

The returned `data` object will look like this JSON structure:

```json
{
  "success": true,
  "user_role": "host", // or "rider"
  "hosting_info": [
    {
      "template_id": "...",
      "from_location": "...",
	  "available_seats": 3,
      "pod_info": { "active_members": 2, ... } 
    }
  ],
  "riding_info": [],
  "pending_matches": [
    {
      "match_id": "...",
      "role": "host", // The user's role in this match
      "overall_score": 0.85, // 85% match
      "status": "pending", // 'pending', 'accepted', etc.
      "template_info": { ... }, // Details about the ride/host
      "request_info": { ... }   // Details about the rider/request
    }
  ]
}
```

## 3. Display Logic (React Example)

Here is a conceptual React component structure:

```jsx
function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    fetchDashboardData().then(setDashboardData);
  }, []);

  if (!dashboardData) return <div>Loading...</div>;

  return (
    <div>
      <h1>Welcome, {dashboardData.user_role}</h1>

      {/* SECTION 1: MY ACTIVE RIDES */}
      <section>
        <h2>My Rides</h2>
        {dashboardData.hosting_info?.map(ride => (
          <div key={ride.template_id} className="ride-card">
            <h3>From: {ride.from_location} To: {ride.to_location}</h3>
            <p>Seats: {ride.available_seats} available</p>
          </div>
        ))}
      </section>

      {/* SECTION 2: MATCH SUGGESTIONS */}
      <section>
        <h2>Matches Found ({dashboardData.pending_matches?.length})</h2>
        
        {dashboardData.pending_matches?.map(match => (
            <div key={match.match_id} className="match-card">
                <div className="score">
                    Match Score: {Math.round(match.overall_score * 100)}%
                </div>
                
                <div className="details">
                    {/* If I am the Host, show Rider info */}
                    {match.role === 'host' && (
                        <>
                            <p>Rider coming from: {match.request_info.pickup_location}</p>
                            <p>Detour: {match.pickup_distance_meters} meters</p>
                        </>
                    )}
                    
                    {/* If I am the Rider, show Host info */}
                    {match.role === 'rider' && (
                        <>
                            <p>Host Route: {match.template_info.from_location} → {match.template_info.to_location}</p>
                            <p>Vehicle: {match.template_info.vehicle_type}</p>
                        </>
                    )}
                </div>

                <div className="actions">
                    <button onClick={() => acceptMatch(match.match_id)}>Accept</button>
                    <button onClick={() => skipMatch(match.match_id)}>Skip</button>
                </div>
            </div>
        ))}
      </section>
    </div>
  );
}

// Function to Accept Match
async function acceptMatch(matchId) {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Call the database function to accept
    const { data, error } = await supabase
        .rpc('accept_match_suggestion', {
            match_id: matchId,
            host_id: user.id
        });

    if (error) alert(error.message);
    else {
        alert("Match Accepted!");
        // Refresh dashboard data
    }
}
```
