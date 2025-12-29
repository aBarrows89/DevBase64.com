#!/usr/bin/env node
// Run with: node scripts/importOneByOne.mjs
import { execSync } from 'child_process';

const employees = [
  { firstName: "Brian", lastName: "Albright", email: "brianalbright674@gmail.com", phone: "000-000-0000", position: "Return Center Associate", department: "R10 - Return Center", employeeType: "full_time", hireDate: "2025-08-30" },
  { firstName: "David", lastName: "Allgood", email: "duballgood@gmail.com", phone: "000-000-0000", position: "Return Center Associate", department: "R10 - Return Center", employeeType: "full_time", hireDate: "2022-07-15" },
  { firstName: "Sean", lastName: "Aukerman", email: "hockeydream3000@gmail.com", phone: "000-000-0000", position: "Shipping Associate", department: "WAR - Shipping", employeeType: "full_time", hireDate: "2017-02-01" },
  { firstName: "Randy", lastName: "Ball", email: "Tirechucker3@gmail.com", phone: "000-000-0000", position: "Shipping Associate", department: "WAR - Shipping", employeeType: "full_time", hireDate: "2025-04-29" },
  { firstName: "William", lastName: "Barrows", email: "andy.barrows@gmail.com", phone: "000-000-0000", position: "Inventory Associate", department: "WAR - Inventory", employeeType: "full_time", hireDate: "2025-10-30" },
  { firstName: "Phillip", lastName: "Borland", email: "phillipdb826@gmail.com", phone: "000-000-0000", position: "Wholesale Associate", department: "W08 - Wholesale", employeeType: "full_time", hireDate: "2014-10-01" },
  { firstName: "Jonathan", lastName: "Cermeno", email: "Cermenoj663@gmail.com", phone: "000-000-0000", position: "Wholesale Associate", department: "W08 - Wholesale", employeeType: "full_time", hireDate: "2025-12-09" },
  { firstName: "Vincent", lastName: "Closson", email: "vinny.closson17@gmail.com", phone: "000-000-0000", position: "Receiving Associate", department: "WAR - Receiving", employeeType: "full_time", hireDate: "2025-10-01" },
  { firstName: "Joshua", lastName: "Collier", email: "collierjosh675@gmail.com", phone: "000-000-0000", position: "Export Associate", department: "R25 - Export Tire", employeeType: "full_time", hireDate: "2016-05-26" },
  { firstName: "Robert", lastName: "Collins", email: "rcollins8912@gmail.com", phone: "000-000-0000", position: "Shipping Associate", department: "WAR - Shipping", employeeType: "full_time", hireDate: "2025-11-07" },
  { firstName: "Kevin", lastName: "Curcio", email: "Kcurcio21@gmail.com", phone: "000-000-0000", position: "Return Center Associate", department: "R10 - Return Center", employeeType: "full_time", hireDate: "2025-11-26" },
  { firstName: "Andrew", lastName: "DeArmitt", email: "dearmitt.andrew04@icloud.com", phone: "000-000-0000", position: "Chestnut Ridge Associate", department: "WAR - Chestnut Ridge", employeeType: "full_time", hireDate: "2025-12-08" },
  { firstName: "Dawson", lastName: "Dibert", email: "ddtyranitar@gmail.com", phone: "000-000-0000", position: "Wholesale Associate", department: "W08 - Wholesale", employeeType: "full_time", hireDate: "2025-12-09" },
  { firstName: "Tyler", lastName: "Drexler", email: "tyler.drexler122@gmail.com", phone: "000-000-0000", position: "Receiving Associate", department: "WAR - Receiving", employeeType: "full_time", hireDate: "2025-12-15" },
  { firstName: "Zachary", lastName: "Drexler", email: "drexlerzachary75@gmail.com", phone: "000-000-0000", position: "Shipping Associate", department: "WAR - Shipping", employeeType: "full_time", hireDate: "2025-11-10" },
  { firstName: "Alexis", lastName: "Drost", email: "lexicaddy@gmail.com", phone: "000-000-0000", position: "Wholesale Associate", department: "W08 - Wholesale", employeeType: "full_time", hireDate: "2023-08-28" },
  { firstName: "Alan", lastName: "Duncan", email: "alandunc3@gmail.com", phone: "000-000-0000", position: "Night Shift Associate", department: "WAR - Night Shift", employeeType: "full_time", hireDate: "2025-10-12" },
  { firstName: "Travis", lastName: "Erwin", email: "traviserwin062308@yahoo.com", phone: "000-000-0000", position: "Salaried Employee", department: "SAL - Salary", employeeType: "full_time", hireDate: "2017-12-13" },
  { firstName: "Annie", lastName: "Evans", email: "a62evans@yahoo.com", phone: "000-000-0000", position: "Salaried Employee", department: "SAL - Salary", employeeType: "full_time", hireDate: "2025-09-15" },
  { firstName: "Cooper", lastName: "Firmstone", email: "CJfirmstone2007@gmail.com", phone: "000-000-0000", position: "Return Center Associate", department: "R10 - Return Center", employeeType: "full_time", hireDate: "2025-08-07" },
  { firstName: "Tyler", lastName: "Fissella", email: "tybingfissella22@icloud.com", phone: "000-000-0000", position: "Shipping Associate", department: "WAR - Shipping", employeeType: "full_time", hireDate: "2025-11-10" },
  { firstName: "Ryan", lastName: "Fuller", email: "ryanfuller062104@gmail.com", phone: "000-000-0000", position: "Return Center Associate", department: "R10 - Return Center", employeeType: "full_time", hireDate: "2025-12-10" },
  { firstName: "Troy", lastName: "Gooch", email: "tmgooch1@gmail.com", phone: "000-000-0000", position: "Chestnut Ridge Associate", department: "WAR - Chestnut Ridge", employeeType: "full_time", hireDate: "2025-11-17" },
  { firstName: "Noah", lastName: "Grubbs", email: "noah.grubbs226@gmail.com", phone: "000-000-0000", position: "Chestnut Ridge Associate", department: "WAR - Chestnut Ridge", employeeType: "full_time", hireDate: "2024-12-03" },
  { firstName: "Timothy", lastName: "Hart", email: "TJHart88102688@gmail.com", phone: "000-000-0000", position: "Return Center Associate", department: "R10 - Return Center", employeeType: "full_time", hireDate: "2025-07-21" },
  { firstName: "Joseph", lastName: "Hartman", email: "josephhartman57@yahoo.com", phone: "000-000-0000", position: "Wholesale Associate", department: "W08 - Wholesale", employeeType: "full_time", hireDate: "2025-11-10" },
  { firstName: "Donald", lastName: "Henry", email: "henrydonald7779@yahoo.com", phone: "000-000-0000", position: "Wholesale Associate", department: "W08 - Wholesale", employeeType: "full_time", hireDate: "2022-10-03" },
  { firstName: "David", lastName: "Hoopes", email: "davidhoopes81@gmail.com", phone: "000-000-0000", position: "Inventory Associate", department: "WAR - Inventory", employeeType: "full_time", hireDate: "2025-12-01" },
  { firstName: "Christen", lastName: "Humberson", email: "christenlee2004@gmail.com", phone: "000-000-0000", position: "Night Shift Associate", department: "WAR - Night Shift", employeeType: "full_time", hireDate: "2024-05-21" },
  { firstName: "Maddox", lastName: "Keefer", email: "maddoxkeefer@gmail.com", phone: "000-000-0000", position: "Receiving Associate", department: "WAR - Receiving", employeeType: "full_time", hireDate: "2025-11-05" },
  { firstName: "Vincent", lastName: "Keffer", email: "Vinniekeffer@gmail.com", phone: "000-000-0000", position: "AOT Associate", department: "R10 - AOT", employeeType: "full_time", hireDate: "2025-07-09" },
  { firstName: "Christopher", lastName: "Kelley", email: "Kelleychris106@gmail.com", phone: "000-000-0000", position: "Return Center Associate", department: "R10 - Return Center", employeeType: "full_time", hireDate: "2025-12-01" },
  { firstName: "Billy Bob", lastName: "Kovalcik", email: "kovalcikbilly@gmail.com", phone: "000-000-0000", position: "Receiving Associate", department: "WAR - Receiving", employeeType: "full_time", hireDate: "2025-10-13" },
  { firstName: "Lucas", lastName: "Lamer", email: "lucastlamer@gmail.com", phone: "000-000-0000", position: "Shipping Associate", department: "WAR - Shipping", employeeType: "full_time", hireDate: "2025-02-26" },
  { firstName: "Terry", lastName: "Libengood", email: "tbear0522@yahoo.com", phone: "000-000-0000", position: "Wholesale Associate", department: "W08 - Wholesale", employeeType: "full_time", hireDate: "2025-05-05" },
  { firstName: "Chris", lastName: "Lombardo", email: "christislord057@gmail.com", phone: "000-000-0000", position: "Chestnut Ridge Associate", department: "WAR - Chestnut Ridge", employeeType: "full_time", hireDate: "2025-12-08" },
  { firstName: "Andrew", lastName: "Long", email: "andylong14@icloud.com", phone: "000-000-0000", position: "Return Center Associate", department: "R10 - Return Center", employeeType: "full_time", hireDate: "2023-11-27" },
  { firstName: "Teddy", lastName: "Long", email: "ted.long4@icloud.com", phone: "000-000-0000", position: "AOT Associate", department: "R10 - AOT", employeeType: "full_time", hireDate: "2022-06-01" },
  { firstName: "David", lastName: "Marchewka", email: "marchewka1705@gmail.com", phone: "000-000-0000", position: "AOT Associate", department: "R10 - AOT", employeeType: "full_time", hireDate: "2025-02-17" },
  { firstName: "Jared", lastName: "Mcallister", email: "jaredmca2323@yahoo.com", phone: "000-000-0000", position: "Shipping Associate", department: "WAR - Shipping", employeeType: "full_time", hireDate: "2025-10-13" },
  { firstName: "Jacob", lastName: "Metts", email: "mettsj023@gmail.com", phone: "000-000-0000", position: "Receiving Associate", department: "WAR - Receiving", employeeType: "full_time", hireDate: "2025-11-26" },
  { firstName: "Greg", lastName: "Mohring", email: "Gregmohring7@gmail.com", phone: "000-000-0000", position: "Receiving Associate", department: "WAR - Receiving", employeeType: "full_time", hireDate: "2024-10-21" },
  { firstName: "Skylar", lastName: "Musnug", email: "Smusnug712@gmail.com", phone: "000-000-0000", position: "Receiving Associate", department: "WAR - Receiving", employeeType: "full_time", hireDate: "2024-11-26" },
  { firstName: "Ethan", lastName: "Myers", email: "emon.myers13@gmail.com", phone: "000-000-0000", position: "Everson Associate", department: "R10 - Everson", employeeType: "full_time", hireDate: "2019-06-17" },
  { firstName: "Mark", lastName: "Myers", email: "mark@ietires.com", phone: "000-000-0000", position: "Salaried Employee", department: "SAL - Salary", employeeType: "full_time", hireDate: "2009-11-07" },
  { firstName: "Timothy", lastName: "Myers", email: "tmster2159@gmail.com", phone: "000-000-0000", position: "Export Associate", department: "R25 - Export Tire", employeeType: "full_time", hireDate: "2018-05-25" },
  { firstName: "Jonathan", lastName: "Newton", email: "jonnewton2011@gmail.com", phone: "000-000-0000", position: "AOT Associate", department: "R10 - AOT", employeeType: "full_time", hireDate: "2021-06-01" },
  { firstName: "Jeffrey", lastName: "Perrotta", email: "jperrotta@ietires.com", phone: "000-000-0000", position: "Salaried Employee", department: "SAL - Salary", employeeType: "full_time", hireDate: "2025-10-15" },
  { firstName: "Jeffrey", lastName: "Powers", email: "jeffpowers309@gmail.com", phone: "000-000-0000", position: "Receiving Associate", department: "WAR - Receiving", employeeType: "full_time", hireDate: "2025-12-02" },
  { firstName: "William", lastName: "Price", email: "Williampriceiii@gmail.com", phone: "000-000-0000", position: "Salaried Employee", department: "SAL - Salary", employeeType: "full_time", hireDate: "2024-02-19" },
  { firstName: "Nick", lastName: "Quinn", email: "Mrquinn1985@gmail.com", phone: "000-000-0000", position: "Salaried Employee", department: "SAL - Salary", employeeType: "full_time", hireDate: "2023-08-01" },
  { firstName: "Adam", lastName: "Reynolds", email: "Reynoldsadam38@gmail.com", phone: "000-000-0000", position: "Return Center Associate", department: "R10 - Return Center", employeeType: "full_time", hireDate: "2025-10-13" },
  { firstName: "Josh", lastName: "Richey", email: "jjrichey2@gmail.com", phone: "000-000-0000", position: "AOT Associate", department: "R10 - AOT", employeeType: "full_time", hireDate: "2025-02-03" },
  { firstName: "Jakob", lastName: "Riggle", email: "Jakobriggle@yahoo.com", phone: "000-000-0000", position: "Night Shift Associate", department: "WAR - Night Shift", employeeType: "full_time", hireDate: "2025-05-06" },
  { firstName: "Bradley", lastName: "Shaffor", email: "bshaffor06@gmail.com", phone: "000-000-0000", position: "Night Shift Associate", department: "WAR - Night Shift", employeeType: "full_time", hireDate: "2025-10-12" },
  { firstName: "Richard", lastName: "Shawley", email: "arshawley@lhtot.com", phone: "000-000-0000", position: "Wholesale Associate", department: "W08 - Wholesale", employeeType: "full_time", hireDate: "2011-03-30" },
  { firstName: "Joseph", lastName: "Sherba", email: "josephsherba49@gmail.com", phone: "000-000-0000", position: "Receiving Associate", department: "WAR - Receiving", employeeType: "full_time", hireDate: "2025-07-22" },
  { firstName: "William", lastName: "Shetler", email: "billshetler624@gmail.com", phone: "000-000-0000", position: "Inventory Associate", department: "WAR - Inventory", employeeType: "full_time", hireDate: "2025-09-08" },
  { firstName: "Eric", lastName: "Shuck", email: "shuckeric7@gmail.com", phone: "000-000-0000", position: "Chestnut Ridge Associate", department: "WAR - Chestnut Ridge", employeeType: "full_time", hireDate: "2025-10-27" },
  { firstName: "Steve", lastName: "Simile", email: "stevesimile36@gmail.com", phone: "000-000-0000", position: "Night Shift Associate", department: "WAR - Night Shift", employeeType: "full_time", hireDate: "2025-12-01" },
  { firstName: "Lance", lastName: "Smith", email: "Lance.n.smith@gmail.com", phone: "000-000-0000", position: "Return Center Associate", department: "R10 - Return Center", employeeType: "full_time", hireDate: "2025-07-23" },
  { firstName: "Rahman", lastName: "Terry", email: "trezzysmith28@gmail.com", phone: "000-000-0000", position: "Receiving Associate", department: "WAR - Receiving", employeeType: "full_time", hireDate: "2025-08-06" },
  { firstName: "Sean", lastName: "Thomas", email: "seanwthomas97@gmail.com", phone: "000-000-0000", position: "Shipping Associate", department: "WAR - Shipping", employeeType: "full_time", hireDate: "2024-09-24" },
  { firstName: "Benjamin", lastName: "Truswell", email: "btruswell1@gmail.com", phone: "000-000-0000", position: "AOT Associate", department: "R10 - AOT", employeeType: "full_time", hireDate: "2024-11-23" },
  { firstName: "Robert", lastName: "Waldron", email: "zeroyearcurse@yahoo.com", phone: "000-000-0000", position: "Inventory Associate", department: "WAR - Inventory", employeeType: "full_time", hireDate: "2024-12-16" },
  { firstName: "Levi", lastName: "Weaver", email: "lwweav@gmail.com", phone: "000-000-0000", position: "Salaried Employee", department: "SAL - Salary", employeeType: "full_time", hireDate: "2024-09-30" },
  { firstName: "Charles", lastName: "Williams", email: "Charleswilliams9261@gmail.com", phone: "000-000-0000", position: "Inventory Associate", department: "WAR - Inventory", employeeType: "full_time", hireDate: "2025-10-20" },
  { firstName: "Bruce", lastName: "Woodward", email: "bwood788@gmail.com", phone: "000-000-0000", position: "Receiving Associate", department: "WAR - Receiving", employeeType: "full_time", hireDate: "2025-11-13" },
  { firstName: "Caleb", lastName: "Younkin", email: "younkin12@icloud.com", phone: "000-000-0000", position: "Return Center Associate", department: "R10 - Return Center", employeeType: "full_time", hireDate: "2025-08-18" },
  { firstName: "Cody", lastName: "Younkin", email: "codyyounkin2002@gmail.com", phone: "000-000-0000", position: "Salaried Employee", department: "SAL - Salary", employeeType: "full_time", hireDate: "2022-07-15" },
  { firstName: "Richard", lastName: "Zook", email: "rickzook1985@gmail.com", phone: "000-000-0000", position: "Return Center Associate", department: "R10 - Return Center", employeeType: "full_time", hireDate: "2025-12-10" },
];

let imported = 0;
let failed = 0;

console.log(`Starting import of ${employees.length} employees...\\n`);

for (const emp of employees) {
  const args = JSON.stringify(emp);
  try {
    execSync(`npx convex run personnel:create '${args}'`, {
      stdio: 'pipe',
      cwd: process.cwd()
    });
    imported++;
    console.log(`✓ ${emp.firstName} ${emp.lastName}`);
  } catch (error) {
    failed++;
    console.log(`✗ ${emp.firstName} ${emp.lastName} - ${error.message}`);
  }
}

console.log(`\\n=== Import Complete ===`);
console.log(`Imported: ${imported}`);
console.log(`Failed: ${failed}`);
