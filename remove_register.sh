sed -i '/const \[isRegisterMode, setIsRegisterMode\] = useState(false);/d' src/App.tsx
sed -i 's/if (isRegisterMode) {/if (false) {/g' src/App.tsx
sed -i 's/{isRegisterMode ? '\''Đăng ký Quản trị'\'' : '\''Đăng nhập Quản trị'\''}/Đăng nhập Quản trị/g' src/App.tsx
sed -i 's/{!isRegisterMode && (/(/g' src/App.tsx
sed -i 's/{isRegisterMode ? '\''Tạo tài khoản'\'' : '\''Đăng nhập'\''}/Đăng nhập/g' src/App.tsx
