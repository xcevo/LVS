from datetime import datetime

def ports_check_report(port_var, cell):
	if port_var[cell] == {}:
		flag = 0
		status = "MATCH"
		line = "	Unconnected Ports  : NONE\n"
	else:
		flag = 1
		status = "MISMATCH"
		line = ""
		for key, val in port_var[cell].items():
			line = line+key+" : "+str(val)+"\n"
		
	return f'''
	------------------------------------------------------------
	PORT / PIN CHECK
	------------------------------------------------------------
	Port Mapping       : {status}\n'''+line, flag
	


#==========================================================================

def device_check_report(dev_var, cell):
	line = ""
	count = 0
	for key, val in dev_var[cell].items():
		for dev in val:
			count+=1
			line = line + f'''
	------------------------------------------------------------
	Device Mismatch #{count}
	------------------------------------------------------------
	{key}
	Device Type          : {dev[0]}
	Instance Name        : {dev[1]}\n'''
		
	return f'''
	========================
	DEVICE MISMATCHES
	========================
	Total Device Errors : {count}\n'''+line, count

	

#==========================================================================

def size_check_report(size_var, cell):
	line = ""
	count = 0
	for err in size_var[cell]:
		count+=1
		line = line + f'''
	------------------------------------------------------------
	Device Size Error #{count}
	------------------------------------------------------------
	{err[0]}
	Device Name          : {err[1][0]}
	Length (L)           : {err[1][1]}
	Width (W)            : {err[1][2]}
	
	{err[2]}
	Device Name          : {err[3][0]}
	Length (L)           : {err[3][1]}
	Width (W)            : {err[3][2]}\n'''
		
	return f'''
	========================
	DEVICE SIZE MISMATCHES
	========================
	Total Device Errors : {count}\n'''+line, count


#==========================================================================

def nets_check_report(nets_var, cell):
	line = ""
	count = 0
	for err in nets_var[cell]:
		count+=1
		line = line + f'''
	------------------------------------------------------------
	Nets #{count}
	------------------------------------------------------------
	Schematic           : {err[0]}
	Layout              : {err[1]}

	------------------------------------------------------------\n'''
		
	return f'''
	========================
	NETS MISMATCH
	========================
	Total nets mismatched : {count}\n'''+line, count

	

#==========================================================================

def opens_check_report(opens_var, cell):
	line = ""
	count = 0
	for key, val in opens_var[cell].items():
		count+=1
		line = line + f'''
	------------------------------------------------------------
	Open Net #{count}
	------------------------------------------------------------
	Schematic Net Name   : {key}
	Layout Net Names     : {val}\n'''
	
	return f'''
	========================
	OPEN NETS
	========================
	Total Open Nets : {count}\n'''+line, count


#==========================================================================

def shorts_check_report(shorts_var, cell):
	line = ""
	count = 0
	for key, val in shorts_var[cell].items():
		count+=1
		line = line + f'''
	------------------------------------------------------------
	Short Net #{count}
	------------------------------------------------------------
	Schematic Net Name   : {key}
	Layout Net Names     : {val}\n'''
	
	return f'''
	========================
	SHORTED NETS
	========================
	Total Shorted Nets : {count}\n'''+line, count
	
#==========================================================================

def make_report(user, cell, source, layout, supply, dev_cnt, port_cnt, net_cnt, checks, var):
	run_date = datetime.now()
	run_date = run_date.strftime("%d-%m-%Y %H:%M:%S")
		
	detail = ""
	count = ["NA", "NA", "NA", "NA", "NA", "NA"]
	status = ["NA", "NA", "NA", "NA", "NA", "NA"]
	if checks[0] == True:
		string, count[0] = ports_check_report(var[0], cell)
		detail = detail + string
			
	if checks[1] == True:
		string, count[1] = device_check_report(var[1], cell)
		detail = detail + string
		
	if checks[2] == True:
		string, count[2] = size_check_report(var[2], cell)
		detail = detail + string
		
	if checks[3] == True:
		string, count[3] = nets_check_report(var[3], cell)
		detail = detail + string
		
	if checks[4] == True:
		string, count[4] = opens_check_report(var[4], cell)
		detail = detail + string
		
	if checks[5] == True:
		string, count[5] = shorts_check_report(var[5], cell)
		detail = detail + string
	
	for num, i in enumerate(count):
		if i != "NA":
			if i == 0:
				status[num] = "PASS"
			elif i > 0:
				status[num] = "FAIL"
		
	if all(c==0 or c=="NA" for c in count):
		lvs_status = "✅ PASSED"
	else:
		lvs_status = "❌ FAILED"
		
	
	return f'''
	============================================================
		                LVS VERIFICATION REPORT
	============================================================

	Tool              : Logicknots LVS
	Tool Version      : 1.0
	Run Date          : {run_date} IST
	Run Host          : lvs-server-01
	User              : {user}

	------------------------------------------------------------
	DESIGN INFORMATION
	------------------------------------------------------------
	Top Cell          : {cell}
	Layout Database   : {layout}
	Source Netlist    : {source}
	Technology        : 180nm
	Process Corners   : Typical
	Supply Nets       : {supply}

	------------------------------------------------------------
	RUN OPTIONS
	------------------------------------------------------------
	Hierarchy Mode    : Flattened
	Pin Matching      : By Name
	Net Matching      : By Connectivity
	Tolerance (W/L)   : 2%

	------------------------------------------------------------
	LVS SUMMARY
	------------------------------------------------------------
	✅ LAYOUT VS SCHEMATIC MATCH       : {lvs_status}

	Total Devices (Schematic)          : {dev_cnt[0]}
	Total Devices (Layout)             : {dev_cnt[1]}

	Total Nets (Schematic)             : {net_cnt[0]}
	Total Nets (Layout)                : {net_cnt[1]}

	Total Ports (Schematic)            : {port_cnt[0]}
	Total Ports (Layout)               : {port_cnt[1]}

	------------------------------------------------------------
	CHECK RESULTS SUMMARY
	------------------------------------------------------------
	Check Type                 Status        Count
	------------------------------------------------------------

	Port Check                  {status[0]}           {count[0]}
	Device Check                {status[1]}           {count[1]}
	Device Size Check           {status[2]}           {count[2]}
	Nets Check                  {status[3]}           {count[3]}
	Open Nets                   {status[4]}           {count[4]}
	Shorted Nets                {status[5]}           {count[5]}

	------------------------------------------------------------
	DETAILED LVS RESULTS
	------------------------------------------------------------
	'''+detail+f'''
	------------------------------------------------------------
	FINAL STATUS
	------------------------------------------------------------
	LVS {lvs_status}

	Errors must be resolved before sign-off.

	============================================================
	END OF LVS REPORT
	============================================================'''

