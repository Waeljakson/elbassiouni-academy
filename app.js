import{createClient}from'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.55.0/+esm';

const URL='https://pztlorpsjnvptgmckerp.supabase.co';
const KEY='sb_publishable_ZBH7xWrqHWen-le5GNmz6A_yiVPZ9B_';
const supabase=createClient(URL,KEY);
const accountClient=createClient(URL,KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const $=s=>document.querySelector(s);
const content=$('#content');
const roleNames={teacher:'المعلم',secretary:'السكرتيرة',student:'الطالب',guardian:'ولي الأمر'};
let profile=null,currentPage='dashboard';

if(!$('#signupPhone')){
  $('#signupEmail').closest('label').insertAdjacentHTML('afterend','<label>رقم الموبايل<input id="signupPhone" type="tel" required placeholder="01xxxxxxxxx"></label>');
}

document.querySelectorAll('[data-auth-tab]').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('[data-auth-tab]').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');
  $('#loginForm').classList.toggle('hidden',b.dataset.authTab!=='login');
  $('#signupForm').classList.toggle('hidden',b.dataset.authTab!=='signup');
});

$('#loginForm').onsubmit=async e=>{
  e.preventDefault();
  setAuthMsg('جارٍ تسجيل الدخول…');
  const{error}=await supabase.auth.signInWithPassword({
    email:$('#loginEmail').value.trim(),
    password:$('#loginPassword').value
  });
  if(error)setAuthMsg(arError(error.message));
};

$('#signupForm').onsubmit=async e=>{
  e.preventDefault();
  setAuthMsg('جارٍ إرسال طلب الحساب…');

  const{error}=await supabase.auth.signUp({
    email:$('#signupEmail').value.trim(),
    password:$('#signupPassword').value,
    options:{
      data:{
        full_name:$('#signupName').value.trim(),
        phone:$('#signupPhone').value.trim()
      }
    }
  });

  if(error){
    setAuthMsg(arError(error.message));
    return;
  }

  await supabase.auth.signOut();
  e.target.reset();
  setAuthMsg('تم إرسال طلب الحساب. الحساب غير نشط حتى يفعّله المعلم أو السكرتيرة.');
};

$('#logoutBtn').onclick=()=>supabase.auth.signOut();
$('#menuBtn').onclick=()=>$('.sidebar').classList.toggle('open');

function setAuthMsg(t){
  $('#authMessage').textContent=t;
  $('#authMessage').classList.remove('hidden');
}

function arError(t){
  if(t.includes('Invalid login'))return'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
  if(t.includes('User already registered'))return'هذا البريد الإلكتروني مسجل بالفعل.';
  if(t.toLowerCase().includes('rate limit'))return'تم تجاوز عدد المحاولات. انتظر قليلًا ثم حاول مرة أخرى.';
  return t;
}

supabase.auth.onAuthStateChange((_event,session)=>{
  setTimeout(()=>session?boot(session.user):showAuth(),0);
});

async function boot(user){
  const{data,error}=await supabase.from('profiles').select('*').eq('id',user.id).single();

  if(error||!data){
    await supabase.auth.signOut();
    setAuthMsg('تعذر تحميل صلاحيات الحساب.');
    return;
  }

  if(!data.active){
    await supabase.auth.signOut();
    setAuthMsg('حسابك غير نشط حتى الآن. انتظر موافقة المعلم أو السكرتيرة.');
    return;
  }

  profile=data;
  $('#authView').classList.add('hidden');
  $('#appView').classList.remove('hidden');
  $('#userName').textContent=profile.full_name||user.email;
  $('#userInitial').textContent=(profile.full_name||'م')[0];
  $('#userRole').textContent=roleNames[profile.role]||profile.role;
  buildNav();
  navigate('dashboard');
}

function showAuth(){
  $('#appView').classList.add('hidden');
  $('#authView').classList.remove('hidden');
  profile=null;
}

const navByRole={
  teacher:[
    ['dashboard','⌂','نظرة عامة'],
    ['students','♙','الطلاب'],
    ['attendance','✓','الحضور'],
    ['grades','◇','الدرجات'],
    ['payments','□','الاشتراكات والملزمة'],
    ['expenses','↙','المصروفات'],
    ['users','⚙','الحسابات']
  ],
  secretary:[
    ['dashboard','⌂','نظرة عامة'],
    ['students','♙','الطلاب'],
    ['attendance','✓','الحضور'],
    ['grades','◇','الدرجات'],
    ['users','⚙','طلبات الحسابات']
  ],
  student:[
    ['dashboard','⌂','ملخصي'],
    ['my-attendance','✓','حضوري'],
    ['my-grades','◇','درجاتي'],
    ['my-payments','□','المدفوعات']
  ],
  guardian:[
    ['dashboard','⌂','ملخص الأبناء'],
    ['my-attendance','✓','الحضور'],
    ['my-grades','◇','الدرجات'],
    ['my-payments','□','المدفوعات']
  ]
};

function buildNav(){
  const n=$('#nav');
  n.innerHTML=(navByRole[profile.role]||[]).map(([id,icon,title])=>`<button data-page="${id}"><span>${icon}</span>${title}</button>`).join('');
  n.querySelectorAll('button').forEach(b=>b.onclick=()=>navigate(b.dataset.page));
}

async function navigate(page){
  currentPage=page;
  document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
  $('.sidebar').classList.remove('open');

  const titles={
    dashboard:'نظرة عامة',
    students:'إدارة الطلاب',
    attendance:'الحضور والغياب',
    grades:'الاختبارات والدرجات',
    payments:'الاشتراكات ورسوم الملزمة',
    expenses:'مصروفات المعلم',
    users:'الحسابات وطلبات التفعيل',
    'my-attendance':'سجل الحضور',
    'my-grades':'الدرجات والإنجاز',
    'my-payments':'حالة المدفوعات'
  };

  $('#pageTitle').textContent=titles[page]||'مجموعة البسيوني';
  content.innerHTML='<div class="empty">جارٍ تحميل البيانات…</div>';

  const pages={
    dashboard,
    students,
    attendance,
    grades,
    payments,
    expenses,
    users,
    'my-attendance':familyAttendance,
    'my-grades':familyGrades,
    'my-payments':familyPayments
  };

  await(pages[page]||dashboard)();
}

window.goPage=navigate;

let currentStudents=[];

window.deleteStudent=async function(id,name){
  if(profile.role!=='teacher'){
    toast('حذف الطلاب متاح للمعلم فقط');
    return;
  }

  const confirmed=confirm(
    `هل تريد حذف الطالب "${name}"؟ سيتم حذف سجلاته المرتبطة أيضًا.`
  );

  if(!confirmed)return;

  const{error}=await supabase
    .from('students')
    .delete()
    .eq('id',id);

  if(error){
    toast(error.message);
    return;
  }

  toast('تم حذف الطالب');
  navigate('students');
};

window.editStudent=async function(id){
  const student=currentStudents.find(
    item=>item.id===id
  );

  if(!student){
    toast('تعذر العثور على الطالب');
    return;
  }

  const full_name=prompt(
    'اسم الطالب',
    student.full_name
  );

  if(full_name===null||!full_name.trim())return;

  const grade_level=prompt(
    'الصف',
    student.grade_level||''
  );

  if(grade_level===null||!grade_level.trim())return;

  const phone=prompt(
    'رقم موبايل الطالب',
    student.phone||''
  );

  if(phone===null)return;

  const parent_phone=prompt(
    'رقم موبايل ولي الأمر',
    student.parent_phone||''
  );

  if(parent_phone===null)return;

  const notes=prompt(
    'ملاحظات',
    student.notes||''
  );

  if(notes===null)return;

  const{error}=await supabase
    .from('students')
    .update({
      full_name:full_name.trim(),
      grade_level:grade_level.trim(),
      phone:phone.trim()||null,
      parent_phone:parent_phone.trim()||null,
      notes:notes.trim()||null
    })
    .eq('id',id);

  if(error){
    toast(error.message);
    return;
  }

  toast('تم تعديل بيانات الطالب');
  navigate('students');
};

async function students(){
  const[
    {data:students,error:studentsError},
    {data:subjects,error:subjectsError}
  ]=await Promise.all([
    supabase
      .from('students')
      .select('*')
      .order('created_at',{
        ascending:false
      }),

    supabase
      .from('subjects')
      .select('*')
      .order('name')
  ]);

  if(studentsError||subjectsError){
    content.innerHTML=`
      <div class="empty">
        تعذر تحميل بيانات الطلاب
      </div>
    `;

    return;
  }

  currentStudents=students||[];

  const management=currentStudents.length
    ?`
      <div
        style="
          display:grid;
          gap:10px;
          margin:14px 0 18px;
        "
      >
        ${currentStudents.map(student=>`
          <div
            style="
              display:flex;
              align-items:center;
              justify-content:space-between;
              flex-wrap:wrap;
              gap:10px;
              padding:12px;
              border:1px solid #e6dcff;
              border-radius:12px;
              background:#faf8ff;
            "
          >
            <div>
              <strong>
                ${escapeHtml(student.full_name)}
              </strong>

              <div
                style="
                  color:#777;
                  font-size:13px;
                  margin-top:4px;
                "
              >
                ${escapeHtml(student.grade_level||'بدون صف')}
                —
                ${escapeHtml(student.phone||'بدون هاتف')}
              </div>
            </div>

            <div
              style="
                display:flex;
                gap:8px;
              "
            >
              <button
                type="button"
                class="small-btn"
                onclick="window.editStudent('${student.id}')"
              >
                تعديل
              </button>

              ${
                profile.role==='teacher'
                  ?`
                    <button
                      type="button"
                      class="small-btn"
                      style="
                        background:#fee2e2;
                        color:#b91c1c;
                        border-color:#fecaca;
                      "
                      onclick="window.deleteStudent(
                        '${student.id}',
                        '${escapeAttribute(student.full_name)}'
                      )"
                    >
                      حذف
                    </button>
                  `
                  :''
              }
            </div>
          </div>
        `).join('')}
      </div>
    `
    :'';

  content.innerHTML=`
    <section class="grid-2">
      <div class="panel">
        <div class="panel-head">
          <h3>إدارة الطلاب</h3>
          <span>
            ${currentStudents.length} طالب
          </span>
        </div>

        ${management}

        ${table(
          currentStudents,
          [
            'full_name',
            'grade_level',
            'phone',
            'parent_phone',
            'joined_on'
          ],
          [
            'الاسم',
            'الصف',
            'هاتف الطالب',
            'هاتف ولي الأمر',
            'تاريخ الالتحاق'
          ]
        )}
      </div>

      <div class="panel">
        <h3>إضافة طالب</h3>

        <form
          id="studentForm"
          class="form-grid"
        >
          <label>
            اسم الطالب

            <input
              name="full_name"
              required
            >
          </label>

          <label>
            الصف

            <input
              name="grade_level"
              required
            >
          </label>

          <label>
            رقم موبايل الطالب

            <input
              name="phone"
              type="tel"
              required
              placeholder="01xxxxxxxxx"
            >
          </label>

          <label>
            رقم موبايل ولي الأمر

            <input
              name="parent_phone"
              type="tel"
              required
              placeholder="01xxxxxxxxx"
            >
          </label>

          <label class="wide">
            ملاحظات

            <textarea name="notes"></textarea>
          </label>

          <button class="primary wide">
            حفظ الطالب
          </button>
        </form>

        <hr>

        <h3>إضافة مادة</h3>

        <form
          id="subjectForm"
          class="form-grid"
        >
          <label class="wide">
            اسم المادة

            <input
              name="name"
              required
              placeholder="علم النفس"
            >
          </label>

          <button class="primary wide">
            حفظ المادة
          </button>
        </form>

        <hr>

        <h3>ربط طالب بمادة</h3>

        <form
          id="enrollForm"
          class="form-grid"
        >
          <label>
            الطالب

            <select
              name="student_id"
              required
            >
              ${opts(
                currentStudents,
                'full_name'
              )}
            </select>
          </label>

          <label>
            المادة

            <select
              name="subject_id"
              required
            >
              ${opts(
                subjects,
                'name'
              )}
            </select>
          </label>

          <label>
            الاشتراك الشهري

            <input
              type="number"
              name="monthly_fee"
              value="0"
              min="0"
            >
          </label>

          <label>
            رسوم الملزمة

            <input
              type="number"
              name="booklet_fee"
              value="0"
              min="0"
            >
          </label>

          <button class="primary wide">
            حفظ الربط
          </button>
        </form>
      </div>
    </section>
  `;

  $('#studentForm').onsubmit=event=>
    submitForm(event,'students');

  $('#subjectForm').onsubmit=event=>
    submitForm(event,'subjects');

  $('#enrollForm').onsubmit=event=>
    submitForm(event,'enrollments');
}

async function attendance(){
  const[
    {data:attendanceData},
    {data:enrollmentData}
  ]=await Promise.all([
    supabase.from('attendance').select('*,enrollments(students(full_name),subjects(name))').order('attended_on',{ascending:false}),
    supabase.from('enrollments').select('id,students(full_name),subjects(name)').eq('active',true)
  ]);

  const rows=(attendanceData||[]).map(record=>({
    ...record,
    student:record.enrollments?.students?.full_name,
    subject:record.enrollments?.subjects?.name
  }));

  const form=['teacher','secretary'].includes(profile.role)?`
    <div class="panel">
      <h3>تسجيل حضور</h3>
      <form id="attendanceForm" class="form-grid">
        <label class="wide">
          الطالب والمادة
          <select name="enrollment_id" required>
            ${opts(enrollmentData,item=>`${item.students?.full_name||''} — ${item.subjects?.name||''}`)}
          </select>
        </label>
        <label>التاريخ<input type="date" name="attended_on" required></label>
        <label>
          الحالة
          <select name="status">
            <option value="present">حاضر</option>
            <option value="absent">غائب</option>
            <option value="late">متأخر</option>
            <option value="excused">بعذر</option>
          </select>
        </label>
        <button class="primary wide">حفظ الحضور</button>
      </form>
    </div>`:'';

  content.innerHTML=`
    <section class="grid-2">
      <div class="panel">
        ${table(rows,['student','subject','attended_on','status'],['الطالب','المادة','التاريخ','الحالة'])}
      </div>
      ${form}
    </section>`;

  if($('#attendanceForm')){
    $('#attendanceForm').onsubmit=e=>submitForm(e,'attendance',null,{recorded_by:profile.id});
  }
}

async function grades(){
  const[
    {data:gradeData},
    {data:studentData},
    {data:examData},
    {data:subjectData}
  ]=await Promise.all([
    supabase.from('grades').select('*,students(full_name),exams(title,max_score)').order('created_at',{ascending:false}),
    supabase.from('students').select('id,full_name'),
    supabase.from('exams').select('id,title,max_score'),
    supabase.from('subjects').select('id,name')
  ]);

  const rows=(gradeData||[]).map(record=>({
    ...record,
    student:record.students?.full_name,
    exam:record.exams?.title,
    result:`${record.score} / ${record.exams?.max_score||0}`
  }));

  const forms=['teacher','secretary'].includes(profile.role)?`
    <div class="panel">
      <h3>إنشاء اختبار</h3>
      <form id="examForm" class="form-grid">
        <label>المادة<select name="subject_id" required>${opts(subjectData,'name')}</select></label>
        <label>عنوان الاختبار<input name="title" required></label>
        <label>التاريخ<input type="date" name="exam_date" required></label>
        <label>الدرجة النهائية<input type="number" name="max_score" min="1" required></label>
        <button class="primary wide">حفظ الاختبار</button>
      </form>

      <hr>

      <h3>إضافة درجة</h3>
      <form id="gradeForm" class="form-grid">
        <label>الطالب<select name="student_id" required>${opts(studentData,'full_name')}</select></label>
        <label>الاختبار<select name="exam_id" required>${opts(examData,exam=>`${exam.title} (${exam.max_score})`)}</select></label>
        <label class="wide">الدرجة<input type="number" step="0.01" name="score" min="0" required></label>
        <button class="primary wide">حفظ الدرجة</button>
      </form>
    </div>`:'';

  content.innerHTML=`
    <section class="grid-2">
      <div class="panel">
        ${table(rows,['student','exam','result'],['الطالب','الاختبار','النتيجة'])}
      </div>
      ${forms}
    </section>`;

  if($('#examForm')){
    $('#examForm').onsubmit=e=>submitForm(e,'exams',null,{created_by:profile.id});
  }

  if($('#gradeForm')){
    $('#gradeForm').onsubmit=e=>submitForm(e,'grades',null,{recorded_by:profile.id});
  }
}

async function payments(){
  const[
    {data:paymentData},
    {data:enrollmentData}
  ]=await Promise.all([
    supabase.from('payments').select('*,enrollments(students(full_name),subjects(name))').order('billing_month',{ascending:false}),
    supabase.from('enrollments').select('id,students(full_name),subjects(name)').eq('active',true)
  ]);

  const rows=(paymentData||[]).map(payment=>({
    ...payment,
    student:payment.enrollments?.students?.full_name,
    type:payment.payment_type==='subscription'?'اشتراك':'ملزمة',
    money:`${payment.amount_paid} / ${payment.amount_due}`
  }));

  const form=profile.role==='teacher'?`
    <div class="panel">
      <h3>تسجيل استحقاق أو دفعة</h3>
      <form id="paymentForm" class="form-grid">
        <label class="wide">
          الطالب والمادة
          <select name="enrollment_id" required>
            ${opts(enrollmentData,item=>`${item.students?.full_name||''} — ${item.subjects?.name||''}`)}
          </select>
        </label>
        <label>
          البند
          <select name="payment_type">
            <option value="subscription">اشتراك</option>
            <option value="booklet">ملزمة</option>
          </select>
        </label>
        <label>شهر الاستحقاق<input type="date" name="billing_month" required></label>
        <label>المطلوب<input type="number" name="amount_due" min="0" required></label>
        <label>المدفوع<input type="number" name="amount_paid" min="0" value="0"></label>
        <label>
          الحالة
          <select name="status">
            <option value="unpaid">غير مدفوع</option>
            <option value="partial">جزئي</option>
            <option value="paid">مدفوع</option>
          </select>
        </label>
        <label>تاريخ الدفع<input type="date" name="paid_on"></label>
        <button class="primary wide">حفظ</button>
      </form>
    </div>`:'';

  content.innerHTML=`
    <section class="grid-2">
      <div class="panel">
        ${table(rows,['student','type','billing_month','money','status'],['الطالب','البند','الشهر','المدفوع/المطلوب','الحالة'])}
      </div>
      ${form}
    </section>`;

  if($('#paymentForm')){
    $('#paymentForm').onsubmit=e=>submitForm(e,'payments',null,{recorded_by:profile.id});
  }
}

async function expenses(){
  const{data}=await supabase.from('teacher_expenses').select('*').order('expense_date',{ascending:false});

  content.innerHTML=`
    <section class="grid-2">
      <div class="panel">
        ${table(data,['expense_date','category','description','amount'],['التاريخ','التصنيف','البيان','المبلغ'])}
      </div>
      <div class="panel">
        <h3>إضافة مصروف</h3>
        <form id="expenseForm" class="form-grid">
          <label>التاريخ<input type="date" name="expense_date" required></label>
          <label>التصنيف<input name="category" required></label>
          <label class="wide">البيان<input name="description" required></label>
          <label class="wide">المبلغ<input type="number" step="0.01" min="0" name="amount" required></label>
          <button class="primary wide">حفظ المصروف</button>
        </form>
      </div>
    </section>`;

  $('#expenseForm').onsubmit=e=>submitForm(e,'teacher_expenses',null,{created_by:profile.id});
}

window.setAccountActive=async function(id,active){
  if(!['teacher','secretary'].includes(profile.role)){
    toast('ليس لديك صلاحية تفعيل الحسابات.');
    return;
  }

  if(!confirm(active?'هل تريد تفعيل حساب هذا الطالب؟':'هل تريد إيقاف حساب هذا الطالب؟'))return;

  const{error}=await supabase
    .from('profiles')
    .update({active})
    .eq('id',id)
    .eq('role','student');

  if(error){
    toast(arError(error.message));
    return;
  }

  toast(active?'تم تفعيل حساب الطالب.':'تم إيقاف حساب الطالب.');
  navigate('users');
};

async function users(){
  const[
    {data:accountData,error:accountError},
    {data:studentData}
  ]=await Promise.all([
    supabase.from('profiles').select('*').order('active',{ascending:true}).order('created_at',{ascending:false}),
    supabase.from('students').select('id,full_name').order('full_name')
  ]);

  if(accountError){
    content.innerHTML='<div class="empty">تعذر تحميل الحسابات.</div>';
    return;
  }

  const accounts=accountData||[];
  const studentList=studentData||[];

  const rows=accounts.map(account=>({
    ...account,
    role_ar:roleNames[account.role]||account.role,
    status:account.active?'نشط':'بانتظار التفعيل',
    account_action:account.role==='student'
      ?`<button class="small-btn" onclick="window.setAccountActive('${account.id}',${!account.active})">${account.active?'إيقاف':'تفعيل'}</button>`
      :'—'
  }));

  const pendingCount=accounts.filter(account=>account.role==='student'&&!account.active).length;

  const teacherTools=profile.role==='teacher'?`
    <h3>تعديل صلاحية حساب</h3>
    <form id="roleForm" class="form-grid">
      <label class="wide">
        الحساب
        <select name="id" required>
          ${opts(accounts,account=>`${account.full_name||'بدون اسم'} — ${roleNames[account.role]||account.role}`)}
        </select>
      </label>
      <label class="wide">
        الدور
        <select name="role" required>
          <option value="teacher">معلم</option>
          <option value="secretary">سكرتيرة</option>
          <option value="student">طالب</option>
          <option value="guardian">ولي أمر</option>
        </select>
      </label>
      <button class="primary wide">تحديث الصلاحية</button>
    </form>

    <hr>

    <h3>إضافة سكرتيرة</h3>
    <form id="secretaryForm" class="form-grid">
      <label>اسم السكرتيرة<input name="full_name" required></label>
      <label>البريد الإلكتروني<input type="email" name="email" required></label>
      <label class="wide">كلمة مرور مؤقتة<input type="password" name="password" minlength="6" required></label>
      <button class="primary wide">إنشاء حساب السكرتيرة</button>
    </form>

    <hr>`:'';

  content.innerHTML=`
    <section class="grid-2">
      <div class="panel">
        <div class="panel-head">
          <h3>الحسابات وطلبات التفعيل</h3>
          <span>${pendingCount} منتظر</span>
        </div>

        ${table(
          rows,
          ['full_name','phone','role_ar','status','account_action'],
          ['الاسم','الموبايل','الصلاحية','الحالة','إجراء']
        )}
      </div>

      <div class="panel">
        ${teacherTools}

        <h3>ربط حساب طالب بسجل الطالب</h3>
        <form id="linkStudentForm" class="form-grid">
          <label>
            حساب الطالب
            <select name="user_id" required>
              ${opts(
                accounts.filter(account=>account.role==='student'),
                account=>`${account.full_name} — ${account.active?'نشط':'منتظر'}`
              )}
            </select>
          </label>
          <label>
            سجل الطالب
            <select name="id" required>${opts(studentList,'full_name')}</select>
          </label>
          <button class="primary wide">حفظ الربط</button>
        </form>
      </div>
    </section>`;

  if($('#roleForm')){
    $('#roleForm').onsubmit=async e=>{
      e.preventDefault();
      const button=e.submitter;
      button.disabled=true;
      const form=Object.fromEntries(new FormData(e.target));

      const{error}=await supabase
        .from('profiles')
        .update({role:form.role,active:true})
        .eq('id',form.id);

      button.disabled=false;

      if(error){
        toast(arError(error.message));
        return;
      }

      toast('تم تحديث الصلاحية.');
      navigate('users');
    };
  }

  $('#linkStudentForm').onsubmit=async e=>{
    e.preventDefault();
    const button=e.submitter;
    button.disabled=true;
    const form=Object.fromEntries(new FormData(e.target));

    const{error}=await supabase
      .from('students')
      .update({user_id:form.user_id})
      .eq('id',form.id);

    button.disabled=false;

    if(error){
      toast(arError(error.message));
      return;
    }

    toast('تم ربط الحساب بسجل الطالب.');
    navigate('users');
  };

  if($('#secretaryForm')){
    $('#secretaryForm').onsubmit=async e=>{
      e.preventDefault();

      const button=e.submitter;
      button.disabled=true;
      button.textContent='جارٍ إنشاء الحساب…';

      const form=Object.fromEntries(new FormData(e.target));

      const{data,error}=await accountClient.auth.signUp({
        email:form.email.trim(),
        password:form.password,
        options:{
          data:{
            full_name:form.full_name.trim()
          }
        }
      });

      if(error){
        button.disabled=false;
        button.textContent='إنشاء حساب السكرتيرة';
        toast(arError(error.message));
        return;
      }

      if(!data.user){
        button.disabled=false;
        button.textContent='إنشاء حساب السكرتيرة';
        toast('تعذر إنشاء الحساب.');
        return;
      }

      const{error:roleError}=await supabase
        .from('profiles')
        .update({
          role:'secretary',
          active:true,
          full_name:form.full_name.trim()
        })
        .eq('id',data.user.id);

      button.disabled=false;
      button.textContent='إنشاء حساب السكرتيرة';

      if(roleError){
        toast('تم إنشاء الحساب، لكن تعذر تعيين صلاحية السكرتيرة: '+arError(roleError.message));
        return;
      }

      e.target.reset();
      toast('تم إنشاء حساب السكرتيرة وأصبح نشطًا.');
      navigate('users');
    };
  }
}

async function familyDashboard(){
  const{data:studentData}=await supabase.from('students').select('*');
  const{data:attendanceData}=await supabase.from('attendance').select('status');
  const{data:gradeData}=await supabase.from('grades').select('score,exams(max_score)');

  const total=attendanceData?.length||0;
  const present=attendanceData?.filter(row=>row.status==='present').length||0;
  const attendancePercentage=total?Math.round((present/total)*100):0;

  const average=gradeData?.length
    ?Math.round(gradeData.reduce((sum,row)=>{
      const maximum=Number(row.exams?.max_score||1);
      return sum+(Number(row.score||0)/maximum)*100;
    },0)/gradeData.length)
    :0;

  content.innerHTML=`
    <section class="stats">
      <article class="stat"><span>الطلاب المرتبطون</span><b>${studentData?.length||0}</b></article>
      <article class="stat"><span>نسبة الحضور</span><b>${attendancePercentage}%</b></article>
      <article class="stat"><span>متوسط الإنجاز</span><b>${average}%</b></article>
      <article class="stat"><span>سجلات المتابعة</span><b>${total}</b></article>
    </section>
    <section class="panel" style="margin-top:18px">
      <h3>التقدم الدراسي</h3>
      <p class="muted">متوسط الدرجات المحققة</p>
      <div class="progress"><span style="width:${average}%"></span></div>
    </section>`;
}

async function familyAttendance(){return attendance()}
async function familyGrades(){return grades()}
async function familyPayments(){return payments()}

function opts(data,label){
  return'<option value="">اختر…</option>'+
    (data||[]).map(item=>{
      const text=typeof label==='function'?label(item):item[label];
      return`<option value="${escapeHtml(item.id)}">${escapeHtml(text||'بدون اسم')}</option>`;
    }).join('');
}

function table(data,fields,headings){
  if(!data?.length)return'<div class="empty">لا توجد بيانات حتى الآن</div>';

  return`
    <div class="table-wrap">
      <table>
        <thead>
          <tr>${headings.map(heading=>`<th>${escapeHtml(heading)}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${data.map(row=>`<tr>${fields.map(field=>`<td>${fmt(row[field])}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function fmt(value){
  if(value===true)return'<span class="badge green">نعم</span>';
  if(value===false)return'<span class="badge red">لا</span>';

  const translations={
    present:'حاضر',
    absent:'غائب',
    late:'متأخر',
    excused:'بعذر',
    paid:'مدفوع',
    unpaid:'غير مدفوع',
    partial:'جزئي'
  };

  if(typeof value==='string'&&value.trim().startsWith('<'))return value;

  return escapeHtml(translations[value]||value||'—');
}

async function submitForm(e,tableName,_reload,extra={}){
  e.preventDefault();

  const button=e.submitter;
  button.disabled=true;

  const payload=Object.fromEntries(new FormData(e.target));

  Object.keys(payload).forEach(key=>{
    if(payload[key]==='')payload[key]=null;
  });

  const{error}=await supabase.from(tableName).insert({...payload,...extra});

  button.disabled=false;

  if(error){
    toast(arError(error.message));
    return;
  }

  e.target.reset();
  toast('تم الحفظ بنجاح.');
  navigate(currentPage);
}

function escapeHtml(value){
  return String(value??'')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
}

function escapeAttribute(value){
  return String(value??'')
    .replaceAll('\\','\\\\')
    .replaceAll("'","\\'")
    .replaceAll('"','&quot;')
    .replaceAll('\n',' ');
}

function toast(message){
  const element=$('#toast');
  element.textContent=message;
  element.classList.remove('hidden');

  setTimeout(()=>{
    element.classList.add('hidden');
  },3200);
}
