const prisma = require('../config/prisma');
const { computeTenancySummary } = require('./rentTenancyController');

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

const getRentDashboardStats = async (req, res, next) => {
  try {
    const [totalBuildings, totalRooms, occupiedRooms, activeTenancies, electricityBills, recentPayments] = await Promise.all([
      prisma.rentBuilding.count(),
      prisma.rentRoom.count(),
      prisma.rentRoom.count({ where: { status: 'OCCUPIED' } }),
      prisma.rentTenancy.findMany({
        where: { status: 'ACTIVE' },
        include: {
          tenant: { select: { id: true, name: true } },
          payments: true,
          room: { select: { id: true, roomNumber: true, building: { select: { id: true, name: true } } } }
        }
      }),
      prisma.rentElectricityBill.findMany({ select: { status: true, amount: true } }),
      prisma.rentPayment.findMany({
        take: 5,
        orderBy: { paymentDate: 'desc' },
        include: {
          tenancy: {
            select: {
              tenant: { select: { name: true } },
              room: { select: { roomNumber: true, building: { select: { name: true } } } }
            }
          }
        }
      })
    ]);

    let expectedRent = 0;
    let collectedRent = 0;
    let pendingRent = 0;

    activeTenancies.forEach((t) => {
      const summary = computeTenancySummary(t);
      expectedRent += t.monthlyRent;
      collectedRent += summary.currentCycle?.paid || 0;
      pendingRent += summary.totalPending;
    });

    const electricityPendingBills = electricityBills.filter((b) => b.status !== 'PAID');
    const electricityPendingAmount = round2(electricityPendingBills.reduce((sum, b) => sum + b.amount, 0));
    const electricityCollectedAmount = round2(
      electricityBills.filter((b) => b.status === 'PAID').reduce((sum, b) => sum + b.amount, 0)
    );

    res.json({
      totalBuildings,
      totalRooms,
      occupiedRooms,
      vacantRooms: totalRooms - occupiedRooms,
      activeTenancyCount: activeTenancies.length,
      expectedRent: round2(expectedRent),
      collectedRent: round2(collectedRent),
      pendingRent: round2(pendingRent),
      electricity: {
        pendingCount: electricityPendingBills.length,
        pendingAmount: electricityPendingAmount,
        collectedAmount: electricityCollectedAmount
      },
      recentPayments: recentPayments.map((p) => ({
        id: p.id,
        amount: p.amount,
        paymentDate: p.paymentDate,
        paymentMode: p.paymentMode,
        tenantName: p.tenancy?.tenant?.name || 'N/A',
        roomNumber: p.tenancy?.room?.roomNumber || '',
        buildingName: p.tenancy?.room?.building?.name || ''
      }))
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getRentDashboardStats };
