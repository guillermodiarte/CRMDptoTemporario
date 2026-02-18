-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'VISUALIZER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserSession_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BlacklistEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guestName" TEXT NOT NULL,
    "guestPhone" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "reportedById" TEXT,
    "departmentName" TEXT,
    "checkIn" DATETIME,
    "checkOut" DATETIME,
    "totalAmount" REAL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "sessionId" TEXT,
    CONSTRAINT "BlacklistEntry_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "BlacklistEntry_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_BlacklistEntry" ("checkIn", "checkOut", "createdAt", "departmentName", "guestName", "guestPhone", "id", "isActive", "reason", "reportedById", "totalAmount", "updatedAt") SELECT "checkIn", "checkOut", "createdAt", "departmentName", "guestName", "guestPhone", "id", "isActive", "reason", "reportedById", "totalAmount", "updatedAt" FROM "BlacklistEntry";
DROP TABLE "BlacklistEntry";
ALTER TABLE "new_BlacklistEntry" RENAME TO "BlacklistEntry";
CREATE TABLE "new_Department" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL DEFAULT 'APARTMENT',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT,
    "wifiName" TEXT,
    "wifiPass" TEXT,
    "alias" TEXT,
    "basePrice" REAL NOT NULL DEFAULT 0,
    "cleaningFee" REAL NOT NULL DEFAULT 0,
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "googleMapsLink" TEXT,
    "keyLocation" TEXT,
    "lockBoxCode" TEXT,
    "ownerName" TEXT,
    "meterLuz" TEXT,
    "meterGas" TEXT,
    "meterAgua" TEXT,
    "meterWifi" TEXT,
    "inventoryNotes" TEXT,
    "airbnbLink" TEXT,
    "bookingLink" TEXT,
    "platformLinks" TEXT,
    "images" TEXT NOT NULL DEFAULT '[]',
    "bedCount" INTEGER NOT NULL,
    "maxPeople" INTEGER NOT NULL,
    "hasParking" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "sessionId" TEXT,
    CONSTRAINT "Department_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Department" ("address", "airbnbLink", "alias", "basePrice", "bedCount", "bookingLink", "cleaningFee", "color", "createdAt", "description", "googleMapsLink", "hasParking", "id", "images", "inventoryNotes", "isActive", "isArchived", "keyLocation", "lockBoxCode", "maxPeople", "meterAgua", "meterGas", "meterLuz", "meterWifi", "name", "ownerName", "platformLinks", "type", "updatedAt", "wifiName", "wifiPass") SELECT "address", "airbnbLink", "alias", "basePrice", "bedCount", "bookingLink", "cleaningFee", "color", "createdAt", "description", "googleMapsLink", "hasParking", "id", "images", "inventoryNotes", "isActive", "isArchived", "keyLocation", "lockBoxCode", "maxPeople", "meterAgua", "meterGas", "meterLuz", "meterWifi", "name", "ownerName", "platformLinks", "type", "updatedAt", "wifiName", "wifiPass" FROM "Department";
DROP TABLE "Department";
ALTER TABLE "new_Department" RENAME TO "Department";
CREATE TABLE "new_Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "quantity" INTEGER DEFAULT 1,
    "unitPrice" REAL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "departmentId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "sessionId" TEXT,
    CONSTRAINT "Expense_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Expense_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Expense" ("amount", "createdAt", "date", "departmentId", "description", "id", "isDeleted", "quantity", "type", "unitPrice", "updatedAt") SELECT "amount", "createdAt", "date", "departmentId", "description", "id", "isDeleted", "quantity", "type", "unitPrice", "updatedAt" FROM "Expense";
DROP TABLE "Expense";
ALTER TABLE "new_Expense" RENAME TO "Expense";
CREATE TABLE "new_Note" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'PERSONAL',
    "sessionId" TEXT,
    CONSTRAINT "Note_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Note_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Note" ("content", "createdAt", "id", "type", "updatedAt", "userId") SELECT "content", "createdAt", "id", "type", "updatedAt", "userId" FROM "Note";
DROP TABLE "Note";
ALTER TABLE "new_Note" RENAME TO "Note";
CREATE TABLE "new_Reservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "departmentId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'DIRECT',
    "status" TEXT NOT NULL DEFAULT 'TENTATIVE',
    "guestName" TEXT NOT NULL,
    "guestPhone" TEXT,
    "guestPeopleCount" INTEGER NOT NULL,
    "bedsRequired" INTEGER NOT NULL DEFAULT 1,
    "checkIn" DATETIME NOT NULL,
    "checkOut" DATETIME NOT NULL,
    "totalAmount" REAL NOT NULL,
    "depositAmount" REAL NOT NULL DEFAULT 0,
    "cleaningFee" REAL NOT NULL DEFAULT 0,
    "amenitiesFee" REAL NOT NULL DEFAULT 0,
    "groupId" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "exchangeRate" REAL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "hasParking" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "sessionId" TEXT,
    CONSTRAINT "Reservation_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Reservation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Reservation" ("amenitiesFee", "bedsRequired", "checkIn", "checkOut", "cleaningFee", "createdAt", "currency", "departmentId", "depositAmount", "exchangeRate", "groupId", "guestName", "guestPeopleCount", "guestPhone", "hasParking", "id", "notes", "paymentStatus", "source", "status", "totalAmount", "updatedAt") SELECT "amenitiesFee", "bedsRequired", "checkIn", "checkOut", "cleaningFee", "createdAt", "currency", "departmentId", "depositAmount", "exchangeRate", "groupId", "guestName", "guestPeopleCount", "guestPhone", "hasParking", "id", "notes", "paymentStatus", "source", "status", "totalAmount", "updatedAt" FROM "Reservation";
DROP TABLE "Reservation";
ALTER TABLE "new_Reservation" RENAME TO "Reservation";
CREATE TABLE "new_Supply" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "cost" REAL NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "sessionId" TEXT,
    CONSTRAINT "Supply_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Supply" ("cost", "createdAt", "id", "isActive", "name", "updatedAt") SELECT "cost", "createdAt", "id", "isActive", "name", "updatedAt" FROM "Supply";
DROP TABLE "Supply";
ALTER TABLE "new_Supply" RENAME TO "Supply";
CREATE TABLE "new_SystemSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT,
    "sessionId" TEXT,
    CONSTRAINT "SystemSettings_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_SystemSettings" ("id", "key", "updatedAt", "updatedBy", "value") SELECT lower(hex(randomblob(16))), "key", "updatedAt", "updatedBy", "value" FROM "SystemSettings";
DROP TABLE "SystemSettings";
ALTER TABLE "new_SystemSettings" RENAME TO "SystemSettings";
CREATE UNIQUE INDEX "SystemSettings_sessionId_key_key" ON "SystemSettings"("sessionId", "key");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "image" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "email", "id", "image", "isActive", "name", "password", "phone", "updatedAt") SELECT "createdAt", "email", "id", "image", "isActive", "name", "password", "phone", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_userId_sessionId_key" ON "UserSession"("userId", "sessionId");

