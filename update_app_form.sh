sed -i 's/<label className="block text-sm font-bold text-slate-700 mb-1">Email<\/label>/<label className="block text-sm font-bold text-slate-700 mb-1">Tên đăng nhập<\/label>/g' src/App.tsx
sed -i 's/type="email"/type="text"/g' src/App.tsx
sed -i 's/value={email}/value={username}/g' src/App.tsx
sed -i 's/onChange={(e) => setEmail(e.target.value)}/onChange={(e) => setUsername(e.target.value)}/g' src/App.tsx
sed -i 's/placeholder="admin@example.com"/placeholder="Nhập tên đăng nhập"/g' src/App.tsx
sed -i 's/Vui lòng nhập Email để khôi phục mật khẩu./Vui lòng nhập tên đăng nhập để khôi phục mật khẩu./g' src/App.tsx
