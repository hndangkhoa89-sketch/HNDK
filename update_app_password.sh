sed -i 's/await register(`${username}@system.local`, password)/await register(`${username}@system.local`, password + "_system")/g' src/App.tsx
sed -i 's/await login(`${username}@system.local`, password)/await login(`${username}@system.local`, password + "_system")/g' src/App.tsx
