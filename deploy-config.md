ได้เลยครับ เพื่อให้การทำงานแยกกันชัดเจนระหว่าง **"เครื่อง Local (สำหรับเขียนโค้ด)"** และ **"เครื่อง Server (สำหรับใช้งานจริงผ่าน dev.biccorp.com)"** ผมแยกไฟล์ `docker-compose` ให้เป็น 2 แบบครับ

คุณสามารถเลือก Copy ไปใช้ตามวัตถุประสงค์ได้เลยครับ

---

### 1. สำหรับเครื่อง Local (Development) 💻

**เป้าหมาย:** เน้นแก้โค้ดแล้วเปลี่ยนทันที (Hot Reload) และเลี่ยง Port ชน

* **ชื่อไฟล์แนะนำ:** `docker-compose.dev.yml` (เวลาใช้รัน: `docker-compose -f docker-compose.dev.yml up -d`)
* **จุดเด่น:**
* เปลี่ยน Port Host เป็น **33201** (ไม่ชนใครแน่นอน)
* มี **Volumes** (`.:/app`) แก้ไฟล์ปุ๊บ หน้าเว็บเปลี่ยนปั๊บ
* ใช้ `NODE_ENV=development`



```yaml
version: '3.8'

services:
  it-admin-portal-app:
    build: .
    container_name: it-admin-portal
    restart: always
    ports:
      - "33201:3001"            # 👈 เข้าผ่าน http://localhost:33201
    environment:
      - NODE_ENV=development
      - PORT=3001
      - AD_URL=ldap://samba-ad
      - AD_BASE_DN=DC=ad,DC=biccorp,DC=com
      - AD_USER=Administrator@ad.biccorp.com
      - AD_PASS=BicCorp@AD2026!
    volumes:
      - .:/app                  # 👈 แก้โค้ดแล้วเปลี่ยนทันที
      - /app/node_modules
    networks:
      - app-network             # คุยกับ Samba Local
      - cf-network              # (เผื่อเทส Tunnel Local)

networks:
  app-network:
    external: true
  cf-network:
    external: true

```

---

### 2. สำหรับเครื่อง Server (Production/Staging) ☁️

**เป้าหมาย:** ใช้งานจริงบน `dev.biccorp.com` ผ่าน Portainer + Cloudflare Tunnel

* **ชื่อไฟล์:** `docker-compose.yml` (ไฟล์หลักที่จะ Push ขึ้น GitHub)
* **จุดเด่น:**
* **ปิด Port Host** (ปลอดภัย 100% ให้เข้าผ่าน Tunnel เท่านั้น)
* **ไม่มี Volumes Code** (ใช้ Code ที่ Build ใน Image นิ่งและเสถียร)
* ใช้ `NODE_ENV=production`



```yaml
version: '3.8'

services:
  it-admin-portal-app:
    build: .
    container_name: it-admin-portal
    restart: always
    # ports:                    # 👈 ปิด Port ไม่ให้เข้าตรงๆ ผ่าน IP (ปลอดภัย)
    #   - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - AD_URL=ldap://samba-ad
      - AD_BASE_DN=DC=ad,DC=biccorp,DC=com
      - AD_USER=Administrator@ad.biccorp.com
      - AD_PASS=BicCorp@AD2026!
    volumes:
      - /app/node_modules       # เก็บ Cache dependencies
      # ❌ เอาบรรทัด .:/app ออก เพื่อให้ใช้ Code จริงที่ Build มา
    networks:
      - default                 # คุยกับ Database/Samba ใน Stack ตัวเอง
      - cf-network              # 👈 สำคัญ! เพื่อให้ Tunnel วิ่งเข้ามาหาได้

networks:
  cf-network:
    external: true              # Network กลางของ Cloudflare Tunnel

```

---

### 📝 คำแนะนำการใช้งาน

1. **บนเครื่อง Local:**
* สร้างไฟล์ `docker-compose.dev.yml`
* สั่งรัน: `docker-compose -f docker-compose.dev.yml up -d --build`
* เข้าเว็บ: `http://localhost:33201`


2. **บน GitHub (เพื่อ Deploy):**
* ใช้โค้ดจากข้อ 2 ใส่ในไฟล์ `docker-compose.yml` หลัก
* Git Push ขึ้นไป
* กด **Pull and redeploy** ใน Portainer
* เข้าเว็บ: `https://dev.biccorp.com`