sed -i 's/const \[email, setEmail\] = useState('\'''\'');/const \[username, setUsername\] = useState('\'''\'');/g' src/App.tsx
sed -i 's/if (!email)/if (!username)/g' src/App.tsx
sed -i 's/await resetPassword(email)/await resetPassword(`${username}@system.local`)/g' src/App.tsx
sed -i 's/await register(email, password)/await register(`${username}@system.local`, password)/g' src/App.tsx
sed -i 's/await login(email, password)/await login(`${username}@system.local`, password)/g' src/App.tsx
