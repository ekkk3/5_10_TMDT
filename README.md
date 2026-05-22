# Fast Food E-commerce

He thong dat do an nhanh gom frontend HTML/CSS/JS thuan, backend Node.js + Express va database MySQL.

## Yeu Cau Moi Truong

- Node.js 18 tro len
- npm
- MySQL 8.x hoac tuong duong

## Cau Truc Chinh

```text
frontend/src/        Giao dien HTML/CSS/JS thuan
backend/src/         API Node.js + Express
database/           Schema va seed data MySQL
docs/               Tai lieu API, database va demo script
```

## Cai Dat Database

Mo MySQL client tai thu muc goc project, sau do chay:

```sql
SOURCE database/schema.sql;
SOURCE database/seeders/001_seed_sample_data.sql;
```

File `database/schema.sql` tao database `fast_food_system` va cac bang chinh. Seeder them roles, admin, customer, danh muc, mon an, option va voucher mau.

## Cai Dat Backend

```bash
cd backend
npm install
copy .env.example .env
```

Neu can, sua file `backend/.env` cho dung thong tin MySQL tren may:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=fast_food_system
```

## Chay He Thong

Chay server backend:

```bash
cd backend
npm start
```

Hoac chay che do dev voi nodemon:

```bash
npm run dev
```

Sau khi server chay, mo:

- Frontend: `http://localhost:3000`
- Health check API: `http://localhost:3000/api/health`

Health check tra ve:

```json
{
  "success": true,
  "message": "API is running"
}
```

## Tai Lieu

- API: `docs/api/README.md`
- Database: `docs/database/README.md`
- Demo script: `docs/demo-script.md`

## Ghi Chu

- Frontend hien tai la scaffold co router, layout, navbar va HomePage co ban.
- Backend hien tai moi co Express server, database config, response helper, error handler va health route.
- Chua code chi tiet cac use case nghiep vu trong buoc setup nen cac trang nhu Thuc don, Gio hang, Dang nhap, Admin dang la trang placeholder.
