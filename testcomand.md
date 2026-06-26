## login

curl -X POST http://127.0.0.1:8787/auth/login -H "Content-Type: application/json" -d "{\"email\": \"owner@kekalstudio.com\", \"password\": \"owner@pass.1\"}"

## access token
    "accessToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJzdXBlci1hZG1pbiIsImVtYWlsIjoib3duZXJAa2VrYWxzdHVkaW8uY29tIiwiaXNTdXBlckFkbWluIjp0cnVlLCJwZXJtaXNzaW9ucyI6W10sImV4cCI6MTc4MjUzODg2MH0.QhrRMQYZrwRC30xjUW3qwthv0r1hNbEkior2n_c8Xv4",

    "refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJzdXBlci1hZG1pbiIsInR5cGUiOiJyZWZyZXNoIiwiZXhwIjoxNzg1MDQ0NDYwfQ.URdA5lcAk2KH7UHMIPjOMdKf7YO5ZWU-w3Jf-yp7WZw"

## read brand identity 
curl http://127.0.0.1:8787/admin/brand-identity \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
  
            curl http://127.0.0.1:8787/admin/brand-identity \
            -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJzdXBlci1hZG1pbiIsImVtYWlsIjoib3duZXJAa2VrYWxzdHVkaW8uY29tIiwiaXNTdXBlckFkbWluIjp0cnVlLCJwZXJtaXNzaW9ucyI6W10sImV4cCI6MTc4MjUzODg2MH0.QhrRMQYZrwRC30xjUW3qwthv0r1hNbEkior2n_c8Xv4"