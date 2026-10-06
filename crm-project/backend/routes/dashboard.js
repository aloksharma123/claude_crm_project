const express=require("express");
const pool=require("../db/pool");
const {requireAuth}=require("../middleware/auth");
const router=express.Router(); router.use(requireAuth);
router.get("/",async(req,res)=>{
 const o=req.user.organizationId;
 const [contacts,companies,openDeals,wonDeals,leads,cases,tasks,recent]=await Promise.all([
  pool.query("SELECT COUNT(*) FROM contacts WHERE organization_id=$1",[o]),
  pool.query("SELECT COUNT(*) FROM companies WHERE organization_id=$1",[o]),
  pool.query("SELECT COUNT(*),COALESCE(SUM(value_cents),0) total_value FROM deals WHERE organization_id=$1 AND stage NOT IN ('won','lost')",[o]),
  pool.query("SELECT COUNT(*),COALESCE(SUM(value_cents),0) total_value FROM deals WHERE organization_id=$1 AND stage='won'",[o]),
  pool.query("SELECT COUNT(*) FROM leads WHERE organization_id=$1 AND status<>'converted'",[o]),
  pool.query("SELECT COUNT(*) FROM cases WHERE organization_id=$1 AND status NOT IN ('closed','resolved')",[o]),
  pool.query("SELECT COUNT(*) FROM activities WHERE organization_id=$1 AND type='task' AND completed=false",[o]),
  pool.query("SELECT id,type,body,due_at,created_at FROM activities WHERE organization_id=$1 ORDER BY created_at DESC LIMIT 8",[o])
 ]);
 res.json({contactCount:+contacts.rows[0].count,companyCount:+companies.rows[0].count,openDealCount:+openDeals.rows[0].count,openPipelineValueCents:+openDeals.rows[0].total_value,wonDealCount:+wonDeals.rows[0].count,wonValueCents:+wonDeals.rows[0].total_value,openLeadCount:+leads.rows[0].count,openCaseCount:+cases.rows[0].count,openTaskCount:+tasks.rows[0].count,recentActivities:recent.rows});
});
module.exports=router;