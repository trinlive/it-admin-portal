นี่คือโค้ดสำหรับไฟล์ sambatools-command.md ครับ

ผมได้จัดรูปแบบให้สวยงาม อ่านง่ายใน VS Code และ เติมคำสั่ง docker exec -it samba-ad นำหน้าให้ทุกบรรทัด เพื่อให้คุณก๊อปปี้ไปรันได้ทันทีโดยไม่ต้องพิมพ์เพิ่มครับ

Markdown
# 🛠️ คู่มือคำสั่ง Samba Tools & Config Management

รวมคำสั่งสำหรับจัดการ Samba Active Directory ผ่าน Docker
**Container Name:** `samba-ad`

## ⚙️ 1. ตรวจสอบ การ Login
trinyah@bic-dev-it:/var/www/it-admin-portal$ docker exec -it samba-ad samba-tool user show trinyah | grep lastLogon
lastLogon: 0
lastLogonTimestamp: 134146675125478930
trinyah@bic-dev-it:/var/www/it-admin-portal$ docker exec -it samba-ad samba-tool user show trinyah | grep lastLogonTimestamp
lastLogonTimestamp: 134146675125478930
trinyah@bic-dev-it:/var/www/it-admin-portal$ 


---
## ⚙️ 1. ตรวจสอบ Administrator
trinyah@bic-dev-it:/var/www/it-admin-portal$ docker exec -it samba-ad pdbedit -L -v -u Administrator


## ⚙️ 1. การจัดการ Config & Log (Troubleshooting)
ใช้เมื่อแก้ไขไฟล์ตั้งค่า หรือต้องการให้ Log แสดงผล

### 📝 แก้ไขไฟล์ Config
เข้าไปเพิ่ม `log level = 3` และ `log file = /dev/stdout`
```bash
docker exec -it samba-ad vi /samba/etc/smb.conf
🔄 Reload Config (แบบระบุ Path)

สั่งให้ Samba อ่านค่าใหม่ทันทีโดยไม่ต้อง Restart Container

Bash
docker exec -it samba-ad smbcontrol -s /samba/etc/smb.conf all reload-config
✅ ตรวจสอบความถูกต้อง (Testparm)

เช็คว่าไฟล์ Config ที่แก้ไปถูกต้องหรือไม่ และค่า Log ถูกโหลดมาจริงไหม

Bash
docker exec -it samba-ad testparm -s /samba/etc/smb.conf


👤 2. จัดการผู้ใช้ (User Management)
ใช้ตรวจสอบข้อมูล เปรียบเทียบกับหน้าเว็บ หรือรีเซ็ตค่าต่างๆ

ดูรายชื่อ User ทั้งหมด

Bash
docker exec -it samba-ad samba-tool user list
ดูรายละเอียดเชิงลึกของ User

(ดู DN, SID, Group, เบอร์โทร, UserAccountControl)

Bash
docker exec -it samba-ad samba-tool user show <username>
รีเซ็ตรหัสผ่าน User

(กรณีลืมรหัส หรือหน้าเว็บมีปัญหา)

Bash
docker exec -it samba-ad samba-tool user setpassword <username> --newpassword=NewPassword123!
ระงับ / เปิดใช้งาน User (Disable/Enable)

Bash
# ปิดการใช้งาน
docker exec -it samba-ad samba-tool user disable <username>

# เปิดการใช้งาน
docker exec -it samba-ad samba-tool user enable <username>
ลบ User

Bash
docker exec -it samba-ad samba-tool user delete <username>
👥 3. จัดการกลุ่ม (Group Management)
ใช้ตรวจสอบว่า User เข้ากลุ่มสำเร็จจริงหรือไม่

ดูรายชื่อ Group ทั้งหมด

Bash
docker exec -it samba-ad samba-tool group list
ดูสมาชิกในกลุ่ม

(เช็คว่าใครอยู่ในกลุ่มนี้บ้าง)

Bash
docker exec -it samba-ad samba-tool group listmembers "Group Name"
เพิ่มสมาชิกเข้ากลุ่ม

Bash
docker exec -it samba-ad samba-tool group addmembers "Group Name" <username>
ลบสมาชิกออกจากกลุ่ม

Bash
docker exec -it samba-ad samba-tool group removemembers "Group Name" <username>
🏥 4. ตรวจสอบสุขภาพระบบ (Domain Health)
ใช้เมื่อระบบเริ่มรวน หรือเข้าใช้งาน AD ไม่ได้

เช็คสถานะการ Replicate

(สำคัญมากถ้ามี AD หลายตัว)

Bash
docker exec -it samba-ad samba-tool drs showrepl
ตรวจสอบ Database Error

(ใช้ซ่อมฐานข้อมูลเวลาพัง)

Bash
docker exec -it samba-ad samba-tool dbcheck --cross-ncs
Note: ถ้าเจอ Error สามารถเติม --fix ต่อท้ายเพื่อซ่อมได้

ดูว่าเครื่องไหนถือ Role อะไรบ้าง (FSMO Roles)

Bash
docker exec -it samba-ad samba-tool fsmo show
🌐 5. จัดการ DNS (DNS Management)
Active Directory ขาด DNS ไม่ได้ ถ้า Login ช้า หรือ Join Domain ไม่ได้ ให้เช็คหมวดนี้

ดูรายการ DNS ทั้งหมดใน Zone

Bash
docker exec -it samba-ad samba-tool dns query localhost "ad.biccorp.com" @ ALL
เพิ่ม Record ใหม่

(เช่น เพิ่ม IP เครื่อง Printer หรือ File Server)

Bash
docker exec -it samba-ad samba-tool dns add localhost "ad.biccorp.com" <HOSTNAME> A <IP_ADDRESS>
ตัวอย่าง: docker exec -it samba-ad samba-tool dns add localhost "ad.biccorp.com" fileserver A 192.168.1.50

🛠️ 6. คำสั่ง Debug เชิงลึก (Bonus)
ดูข้อมูล User แบบ Low-level (Pdbedit)

ดีมากสำหรับดูว่า Password หมดอายุเมื่อไหร่ หรือ Login ผิดไปกี่ครั้งแล้ว

Bash
docker exec -it samba-ad pdbedit -L -v -u <username>
💡 ทริคการใช้งาน

ถ้าจำคำสั่งไม่ได้ ให้พิมพ์แค่คำสั่งหลัก แล้วกด Enter มันจะโชว์ Help ให้ครับ

Bash
docker exec -it samba-ad samba-tool user
(ระบบจะโชว์ว่า user ทำอะไรได้บ้าง เช่น add, delete, list, show)