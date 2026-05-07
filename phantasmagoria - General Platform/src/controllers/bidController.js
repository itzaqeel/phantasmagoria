// src/controllers/bidController.js
// Blind Bidding System — core business logic
//   - Place bids WITHOUT revealing highest bid amount
//   - Update bids (increase only — never decrease)
//   - Monthly limit: max 3 wins per calendar month
//   - Automated midnight winner selection (handled by scheduler)
//   - Bid status feedback (winning/losing — no amounts revealed)

const { pool }  = require('../config/db');
const { validationResult } = require('express-validator');
const emailService = require('../services/emailService');

/**
 * Helper to identify the current leading bidder for a target date.
 * Highest amount wins; earliest bid wins on tie.
 */
async function getLeadingBidPlayer(targetDate) {
  const [rows] = await pool.query(
    `SELECT b.user_id, p.first_name, u.email 
     FROM bids b
     JOIN users u ON b.user_id = u.id
     LEFT JOIN profiles p ON b.user_id = p.user_id
     WHERE b.bid_date = ? AND b.status = 'active'
     ORDER BY b.amount DESC, b.created_at ASC
     LIMIT 1`,
    [targetDate]
  );
  return rows.length > 0 ? rows[0] : null;
}

// -------------------------
// PLACE A BID
// POST /api/bids
// -------------------------
async function placeBid(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { amount } = req.body;
  const userId     = req.user.id;
  const userRole   = req.user.role;

  // -- Requirement 1: Developer cannot bid
  if (userRole === 'developer') {
    return res.status(403).json({ success: false, message: 'Developer accounts are prohibited from bidding. Please use an Alumni account.' });
  }

  // Calculate tomorrow's date — the date the bid is actually FOR
  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrow = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo' }).format(tomorrowObj);
  const yearMonth = tomorrow.substring(0, 7); // "2026-04"

  try {
    // Check if user already has a bid for tomorrow (bids are stored under tomorrow's date)
    const [existingBids] = await pool.query(
      'SELECT id, amount FROM bids WHERE user_id = ? AND bid_date = ?',
      [userId, tomorrow]
    );

    if (existingBids.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'You already placed a bid for tomorrow. Use PATCH /api/bids/:id to increase it.',
        bid_id: existingBids[0].id,
      });
    }

    // Check monthly win limit (max 3 wins per calendar month, or 4 if event participant)
    const [monthlyWinRecords] = await pool.query(
      'SELECT win_count FROM monthly_wins WHERE user_id = ? AND `year_month` = ?',
      [userId, yearMonth]
    );

    // Get event status from profile
    const [profile] = await pool.query(
      'SELECT has_event_participation FROM profiles WHERE user_id = ?',
      [userId]
    );

    const totalMonthlyWins = monthlyWinRecords.length > 0 ? monthlyWinRecords[0].win_count : 0;
    const hasEventParticipation = profile.length > 0 ? !!profile[0].has_event_participation : false;
    const maximumAllowedWins  = hasEventParticipation ? 4 : 3;

    if (totalMonthlyWins >= maximumAllowedWins) {
      return res.status(403).json({
        success: false,
        message: `You have reached the maximum of ${maximumAllowedWins} wins this month. You cannot bid further this month.`,
        total_monthly_wins: totalMonthlyWins,
        wins_remaining: 0,
      });
    }

    // Track current winner BEFORE we bid
    const oldLeader = await getLeadingBidPlayer(tomorrow);

    // Insert the bid for tomorrow's date explicitly as 'active'
    const [insertionResult] = await pool.query(
      'INSERT INTO bids (user_id, amount, bid_date, STATUS) VALUES (?, ?, ?, ?)',
      [userId, amount, tomorrow, 'active']
    );

    // Check if leader changed AFTER we bid
    const newLeader = await getLeadingBidPlayer(tomorrow);
    if (oldLeader && newLeader && oldLeader.user_id !== newLeader.user_id) {
       // Old leader was outbid by this new user (or someone else if race condition, but unlikely)
       await emailService.sendOutbidNotification(oldLeader.email, oldLeader.first_name, tomorrow);
    }

    res.status(201).json({
      success:          true,
      message:          `Bid placed successfully for tomorrow's (${tomorrow}) alumni highlight.`,
      bid_id:           insertionResult.insertId,
      your_bid_amount:  amount,
      bid_date:         tomorrow,
      total_monthly_wins: totalMonthlyWins,
      wins_remaining:   maximumAllowedWins - totalMonthlyWins,
    });

  } catch (errorResponse) {
    console.error('Place bid error:', errorResponse);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// -------------------------
// UPDATE BID (Increase Only)
// PATCH /api/bids/:id
// -------------------------
async function updateBid(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { amount } = req.body;
  const bidId  = req.params.id;
  const userId = req.user.id;
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo' }).format(new Date());

  // -- Midnight Cutoff check:
  // Bids can be increased anytime during the active day.

    const tomorrowObj = new Date();
    tomorrowObj.setDate(tomorrowObj.getDate() + 1);
    const tomorrow = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo' }).format(tomorrowObj);

    try {
      // Find the bid — must belong to this user and be for the target date (tomorrow)
      const [matchingBids] = await pool.query(
        'SELECT * FROM bids WHERE id = ? AND user_id = ? AND bid_date = ?',
        [bidId, userId, tomorrow]
      );

      if (matchingBids.length === 0) {
        return res.status(404).json({
          success: false,
          message: `Bid for ${tomorrow} not found, or it has already been settled.`,
        });
      }

    const currentBid = matchingBids[0];

    // Enforce increase-only rule
    if (parseFloat(amount) <= parseFloat(currentBid.amount)) {
      return res.status(400).json({
        success: false,
        message: `New amount must be greater than your current bid of £${currentBid.amount}. Bids can only increase.`,
      });
    }

    // Check bid is still active (not already won/lost)
    if (currentBid.status !== 'active') {
      console.log(`Bid Update Blocked: Bid ID ${bidId} status is '${currentBid.status}' (expected 'active')`);
      return res.status(400).json({
        success: false,
        message: `This bid is currently '${currentBid.status}' and cannot be updated. Bids can only be updated while 'active' (before Midnight).`,
      });
    }

    // Track current winner BEFORE we update
    const oldWinner = await getLeadingBidPlayer(tomorrow);

    // Update the bid amount in the database
    await pool.query('UPDATE bids SET amount = ? WHERE id = ?', [amount, bidId]);

    // Check if leader changed AFTER we updated
    const newWinner = await getLeadingBidPlayer(tomorrow);
    if (oldWinner && newWinner && oldWinner.user_id !== newWinner.user_id && oldWinner.user_id !== userId) {
       // Someone else WAS winning and now they are not (because this user outbid them)
       await emailService.sendOutbidNotification(oldWinner.email, oldWinner.first_name, tomorrow);
    }

    res.json({
      success:              true,
      message:              'Bid updated successfully for tomorrow\'s alumni highlight.',
      bid_id:               bidId,
      new_amount:           amount,
      previous_amount:      currentBid.amount,
    });

  } catch (errorResponse) {
    console.error('Update bid error:', errorResponse);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// -------------------------
// GET BID STATUS
// GET /api/bids/status
// -------------------------
async function getBidStatus(req, res) {
  const userId = req.user.id;
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo' }).format(new Date());
  const yearMonth = today.substring(0, 7);

  // Tomorrow's date — bids are stored under this date
  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrow = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo' }).format(tomorrowObj);

  try {
    // Get this user's bid for tomorrow (bids placed today are stored as bid_date = tomorrow)
    const [userBidsForDate] = await pool.query(
      'SELECT id, amount, STATUS, bid_date, created_at FROM bids WHERE user_id = ? AND bid_date = ?',
      [userId, tomorrow]
    );

    if (userBidsForDate.length === 0) {
      return res.json({
        success: true,
        has_bid: false,
        message: "You haven't placed a bid today yet.",
      });
    }

    const myBid = userBidsForDate[0];
    const userBidAmount = parseFloat(myBid.amount);

    // Tie-break rule: If amounts are equal, the first person to bid wins.
    // Check if there are any bids either > mine, or = mine but placed earlier.
    // IMPORTANT: Must use `tomorrow` — the same date the bids are stored under.
    const [competingBidsCount] = await pool.query(
      `SELECT COUNT(*) as count FROM bids 
       WHERE bid_date = ? AND user_id != ? AND status = 'active' AND (amount > ? OR (amount = ? AND created_at < ?))`,
      [tomorrow, userId, userBidAmount, userBidAmount, myBid.created_at]
    );

    const isWinning = competingBidsCount[0].count === 0;

    // Get current month win data
    const [monthlyWinRecords] = await pool.query(
      'SELECT win_count FROM monthly_wins WHERE user_id = ? AND `year_month` = ?',
      [userId, yearMonth]
    );
    const totalMonthlyWins = monthlyWinRecords.length > 0 ? monthlyWinRecords[0].win_count : 0;

    // Get event status from profile for max wins check
    const [profileStatus] = await pool.query(
      'SELECT has_event_participation FROM profiles WHERE user_id = ?',
      [userId]
    );
    const hasEventParticipationStatus = profileStatus.length > 0 ? !!profileStatus[0].has_event_participation : false;
    const maximumAllowedWinsStatus  = hasEventParticipationStatus ? 4 : 3;

    res.json({
      success:          true,
      has_bid:          true,
      bid_id:           myBid.id,
      your_bid_amount:  myBid.amount,     // Own amount — OK to share
      bid_date:         myBid.bid_date,
      status:           isWinning ? 'winning' : 'losing',
      // Feedback follows the blind bidding protocol
      feedback:         isWinning
        ? 'You are currently the leading bidder for tomorrow\'s exclusive featured spot. Keep going; the winner is announced at Midnight!'
        : 'You are not currently the leading bidder for the exclusive featured spot. Review your sponsorship bid before the Midnight cutoff.',
      total_monthly_wins: totalMonthlyWins,
      wins_remaining:     Math.max(0, maximumAllowedWinsStatus - totalMonthlyWins),
      // NOTE: highest_amount is NEVER included in the response
    });

  } catch (errorResponse) {
    console.error('Get bid status error:', errorResponse);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─────────────────────────────────────────────
// GET MY BID HISTORY
// GET /api/bids/history
// ─────────────────────────────────────────────
async function getBidHistory(req, res) {
  const userId = req.user.id;
  const today2 = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo' }).format(new Date());
  const yearMonth = today2.substring(0, 7);

  try {
    const [bids] = await pool.query(
      `SELECT id, amount, bid_date, status, is_winner, created_at 
       FROM bids WHERE user_id = ? 
       ORDER BY bid_date DESC 
       LIMIT 30`,
      [userId]
    );

    const [monthlyWinRecords] = await pool.query(
      'SELECT win_count FROM monthly_wins WHERE user_id = ? AND `year_month` = ?',
      [userId, yearMonth]
    );
    const totalMonthlyWins = monthlyWinRecords.length > 0 ? monthlyWinRecords[0].win_count : 0;

    // Get event status from profile for max wins check
    const [profileHistory] = await pool.query(
      'SELECT has_event_participation FROM profiles WHERE user_id = ?',
      [userId]
    );
    const hasEventParticipationHistory = profileHistory.length > 0 ? !!profileHistory[0].has_event_participation : false;
    const maximumAllowedWinsHistory  = hasEventParticipationHistory ? 4 : 3;

    res.json({
      success:            true,
      bids,
      total_monthly_wins: totalMonthlyWins,
      wins_remaining:     Math.max(0, maximumAllowedWinsHistory - totalMonthlyWins),
    });

  } catch (errorResponse) {
    console.error('Get bid history error:', errorResponse);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─────────────────────────────────────────────
// CANCEL BID
// DELETE /api/bids/:id
//
// Rules:
//   - A user may only cancel their own bid
//   - The bid must be for today and still 'active'
//   - Bids that have already been won/lost are final and cannot be cancelled
//   - Developers cannot bid and therefore have nothing to cancel
// ─────────────────────────────────────────────
async function cancelBid(req, res) {
  const bidId  = req.params.id;
  const userId = req.user.id;
  const today  = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo' }).format(new Date());

    const tomorrowObj = new Date();
    tomorrowObj.setDate(tomorrowObj.getDate() + 1);
    const tomorrow = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo' }).format(tomorrowObj);

    try {
      // Check if bid exists, belongs to user, and is for tomorrow (active bidding window)
      const [matchingBids] = await pool.query(
        'SELECT * FROM bids WHERE id = ? AND user_id = ? AND bid_date = ? AND STATUS = "active"',
        [bidId, userId, tomorrow]
      );

      if (matchingBids.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Active bid for tomorrow not found or already settled.',
        });
      }

    const bid = matchingBids[0];

    // Normalize DB date to YYYY-MM-DD string for comparison
    const bidDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo' }).format(new Date(bid.bid_date));

    // Prevent cancellation of bids that have already been resolved
    if (bid.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: `This bid has already been resolved as '${bid.status}'. Only active bids can be cancelled.`,
      });
    }

    // Verify the bid is for tomorrow (the active bidding window)
    if (bidDateStr !== tomorrow) {
      return res.status(400).json({
        success: false,
        message: 'You can only cancel a bid for tomorrow\'s highlight (the active bidding window).',
        bid_date: bidDateStr,
        tomorrow,
      });
    }

    // All checks passed — remove the bid
    await pool.query('DELETE FROM bids WHERE id = ?', [bidId]);

    return res.json({
      success: true,
      message: 'Your bid for tomorrow\'s highlight has been cancelled successfully. You may place a new bid before Midnight.',
      cancelled_bid_id:     parseInt(bidId, 10),
      cancelled_bid_amount: bid.amount,
      bid_date:             bid.bid_date,
    });

  } catch (errorResponse) {
    console.error('Cancel bid error:', errorResponse);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─────────────────────────────────────────────
// VIEW TOMORROW'S SLOT
// GET /api/bids/tomorrow
//
// Returns:
//   - Tomorrow's date (the next bidding window)
//   - Bidding window: 00:00 – 23:59 (Asia/Colombo)
//   - Winner selected at Midnight (end of that day)
//   - Whether the user is eligible to bid tomorrow
//     (checks monthly win limit for the relevant month)
//   - Current monthly win standing
// ─────────────────────────────────────────────
async function getTomorrowSlot(req, res) {
  const userId = req.user.id;

  // Compute tomorrow's date in the project timezone
  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrow    = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo' }).format(tomorrowObj);
  const yearMonth   = tomorrow.substring(0, 7); // YYYY-MM (may differ at month boundary)

  try {
    // Gather the user's monthly win count for the relevant month
    const [monthlyWinRecords] = await pool.query(
      'SELECT win_count FROM monthly_wins WHERE user_id = ? AND `year_month` = ?',
      [userId, yearMonth]
    );

    // Get event participation flag for the 4-win allowance
    const [profileData] = await pool.query(
      'SELECT has_event_participation FROM profiles WHERE user_id = ?',
      [userId]
    );

    const totalMonthlyWins = monthlyWinRecords.length > 0 ? monthlyWinRecords[0].win_count : 0;
    const hasEventParticipation = profileData.length > 0 ? !!profileData[0].has_event_participation : false;
    const maximumAllowedWins  = hasEventParticipation ? 4 : 3;
    const winsLeft = Math.max(0, maximumAllowedWins - totalMonthlyWins);
    const eligible = winsLeft > 0;

    return res.json({
      success:    true,
      slot: {
        date:             tomorrow,
        bidding_opens:    `${tomorrow}T00:00:00+05:30`,
        bidding_closes:   `${tomorrow}T23:59:59+05:30`,
        winner_selected:  `${tomorrow}T00:00:00+05:30 (tonight — Midnight cutoff)`,
        timezone:         'Asia/Colombo',
        description:      'Bidding is for tomorrow\'s featured alumni slot. The highest eligible bidder at Midnight tonight wins the spot.',
      },
      eligibility: {
        can_bid:            eligible,
        reason:             eligible
          ? `You have ${winsLeft} win${winsLeft === 1 ? '' : 's'} remaining this month and may participate.`
          : 'You have reached the maximum number of wins for this month and are ineligible to bid tomorrow.',
        monthly_wins_used:  totalMonthlyWins,
        monthly_wins_max:   maximumAllowedWins,
        wins_remaining:     winsLeft,
        event_bonus_active: hasEventParticipation,
      },
    });

  } catch (errorResponse) {
    console.error('Get tomorrow slot error:', errorResponse);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

module.exports = { placeBid, updateBid, getBidStatus, getBidHistory, cancelBid, getTomorrowSlot };
