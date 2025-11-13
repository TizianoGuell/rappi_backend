require('dotenv').config();
const { AppDataSource } = require('../src/db/data-source');
const bcrypt = require('bcrypt');

const Role = require('../src/modules/auth/role.entity').Role;
const User = require('../src/modules/users/user.entity').User;

async function run() {
  await AppDataSource.initialize();
  const ds = AppDataSource;
  const rolesRepo = ds.getRepository(Role);
  const usersRepo = ds.getRepository(User);

  // Test payload simulating front-end sending role as name or id
  const payloads = [
    { name: 'Front Admin', email: 'frontadmin@example.com', password: 'password123', phone: '+541234567890', role: 'admin' },
    { name: 'Front Vendor', email: 'frontvendor@example.com', password: 'password123', phone: '+549876543210', role: 3 },
  ];

  for (const p of payloads) {
    console.log('\n--- Registering:', p.email, 'role=', p.role);
    let role = null;
    if (p.role !== undefined && p.role !== null && p.role !== '') {
      if (typeof p.role === 'number' || /^[0-9]+$/.test(String(p.role))) {
        role = await rolesRepo.findOne({ where: { id: Number(p.role) } });
      } else {
        // Role entity property is `name` (column mapped to 'nombre'), so query by 'name'
        role = await rolesRepo.findOne({ where: { name: String(p.role) } });
      }
    }
    if (!role) {
      role = await rolesRepo.findOne({ where: { id: 1 } });
      console.log('Using default role id', role && role.id);
    } else {
      console.log('Found role:', role.id, role.nombre);
    }

    const hashed = await bcrypt.hash(p.password, 10);
    const userObj = {
      nombre: p.name,
      email: p.email,
      password: hashed,
      telefono: p.phone,
      role: role ? { id: role.id } : null,
    };

    const created = usersRepo.create(userObj);
    const saved = await usersRepo.save(created);
    console.log('Saved user id:', saved.id);
  }

  const recent = await usersRepo.find({ order: { id: 'DESC' }, take: 10 });
  console.log('\nRecent users:', recent.map(u => ({ id: u.id, nombre: u.nombre, email: u.email, roleId: u.role ? u.role.id : null })));

  await ds.destroy();
}

run().catch(e => { console.error(e); process.exit(1); });
