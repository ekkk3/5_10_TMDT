# Fast Food System

He thong dat do an nhanh theo luong: Quan ly mon an -> Khach dat hang -> Admin xac nhan -> Bep nau -> Cho giao.

## Cai dat

1. Tao database:

```sql
SOURCE database/schema.sql;
SOURCE database/seed.sql;
```

2. Cai backend:

```bash
cd backend
npm install
copy .env.example .env
npm start
```

3. Mo giao dien:

- Khach hang: `http://localhost:3000/user/index.html`
- Admin: `http://localhost:3000/admin/admin-dashboard.html`
- KDS: `http://localhost:3000/kds/kds.html`

## Tai khoan mau

- Admin: `admin` / `admin123`
- Bep: `kitchen` / `kitchen123`

## Trang thai don hang

- `pending`: Khach vua dat, Admin can xac nhan.
- `confirmed`: Admin da xac nhan, don xuat hien tren KDS.
- `cooking`: Bep bam "Bat dau lam".
- `ready`: Bep bam "Hoan thanh", don cho giao.
- `cancelled`: Admin huy don.
