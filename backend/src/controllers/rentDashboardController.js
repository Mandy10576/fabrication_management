const prisma = require('../config/prisma');
const { summarizeContract } = require('./rentBillController');

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

const getRentDashboardStats = async (req, res, next) => {
  try {
    const [totalProperties, totalRooms, occupiedRooms, activeContracts, electricityBills, recentPayments] = await Promise.all([
      prisma.rentProperty.count(),
      prisma.rentRoom.count(),
      prisma.rentRoom.count({ where: { status: 'OCCUPIED' } }),
      prisma.rentContract.findMany({
        where: { status: 'ACTIVE' },
        include: { bills: { orderBy: { cycleStart: 'desc' } } }
      }),
      prisma.rentElectricityBill.findMany({ select: { status: true, amount: true } }),
      prisma.rentBillPayment.findMany({
        take: 5,
        orderBy: { paymentDate: 'desc' },
        include: {
          bill: {
            select: {
              contract: {
                select: {
                  tenant: { select: { name: true } },
                  room: { select: { roomNumber: true, property: { select: { name: true } } } }
                }
              }
            }
          }
        }
      })
    ]);

    let expectedRent = 0;
    let collectedRent = 0;
    let pendingRent = 0;
    activeContracts.forEach((c) => {
      const summary = summarizeContract(c);
      expectedRent += c.monthlyRent;
      collectedRent += summary.currentCycle?.paid || 0;
      pendingRent += summary.totalPending;
    });

    const electricityPendingBills = electricityBills.filter((b) => b.status !== 'PAID');
    const electricityPendingAmount = round2(electricityPendingBills.reduce((sum, b) => sum + b.amount, 0));
    const electricityCollectedAmount = round2(
      electricityBills.filter((b) => b.status === 'PAID').reduce((sum, b) => sum + b.amount, 0)
    );

    res.json({
      totalProperties,
      totalRooms,
      occupiedRooms,
      vacantRooms: totalRooms - occupiedRooms,
      activeContractCount: activeContracts.length,
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
        tenantName: p.bill?.contract?.tenant?.name || 'N/A',
        roomNumber: p.bill?.contract?.room?.roomNumber || '',
        propertyName: p.bill?.contract?.room?.property?.name || ''
      }))
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getRentDashboardStats };
