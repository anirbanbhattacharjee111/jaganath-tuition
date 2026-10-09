import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'jaganath_tuition_data_v1';

const defaultData = {
  admin: {
    email: 'admin@jaganathtuition.in',
    password: 'admin123',
  },
  students: [
    {
      id: 'demo-student',
      name: 'Demo Student',
      className: 'Class 9',
      phone: '6001832566',
      email: 'student@example.com',
      password: 'student123',
      verified: true,
      joinedAt: new Date().toISOString(),
    },
  ],
  notices: [
    {
      id: 'notice-1',
      title: 'New Admission Open',
      message:
        'Admissions for Class 9, 10, and 12 are now open. Limited seats available. Contact the office for enrollment details.',
      date: '2026-10-09',
    },
    {
      id: 'notice-2',
      title: 'Monthly Test Schedule',
      message:
        'Monthly tests will be conducted on Saturday. Students must bring their notebooks and complete all tasks on time.',
      date: '2026-10-12',
    },
  ],
  homework: [
    {
      id: 'homework-1',
      title: 'English Grammar Practice',
      className: 'Class 9',
      subject: 'English',
      instructions: 'Complete exercises from page 15 to 20 and submit as PDF or image.',
      date: '2026-10-09',
      attachments: [],
      submissions: [],
    },
  ],
  tests: [
    {
      id: 'test-1',
      title: 'Unit Test 1',
      className: 'Class 10',
      subject: 'Social Science',
      date: '2026-10-15',
      instructions: 'Read the chapter carefully and answer all questions in your own words.',
      fileName: 'social-science-test.pdf',
      fileUrl: '',
    },
  ],
};

const initialState = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
    return defaultData;
  }

  try {
    const parsed = JSON.parse(saved);
    return parsed;
  } catch (error) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
    return defaultData;
  }
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('File could not be processed'));
    reader.readAsDataURL(file);
  });

const formatDate = (value) => {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

function App() {
  const [data, setData] = useState(initialState);
  const [activeView, setActiveView] = useState('home');
  const [session, setSession] = useState({ type: null, user: null });
  const [toast, setToast] = useState('');

  const [adminForm, setAdminForm] = useState({ email: '', password: '' });
  const [studentLogin, setStudentLogin] = useState({ email: '', password: '' });
  const [studentRegister, setStudentRegister] = useState({
    name: '',
    className: 'Class 9',
    phone: '',
    email: '',
    password: '',
  });
  const [otpInput, setOtpInput] = useState('');
  const [pendingOtp, setPendingOtp] = useState('');

  const [noticeForm, setNoticeForm] = useState({ title: '', message: '' });
  const [homeworkForm, setHomeworkForm] = useState({
    title: '',
    className: 'Class 9',
    subject: 'English',
    instructions: '',
    file: null,
  });
  const [testForm, setTestForm] = useState({
    title: '',
    className: 'Class 10',
    subject: 'English',
    date: '',
    instructions: '',
    file: null,
  });

  const [homeworkSubmission, setHomeworkSubmission] = useState({
    homeworkId: '',
    title: '',
    file: null,
  });

  const [noticeDraft, setNoticeDraft] = useState('');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  const currentStudent = useMemo(() => {
    if (session.type !== 'student') return null;
    return session.user;
  }, [session]);

  const showToast = (message) => setToast(message);

  const handleAdminLogin = (event) => {
    event.preventDefault();
    const matches =
      adminForm.email === data.admin.email && adminForm.password === data.admin.password;

    if (!matches) {
      showToast('Admin credentials are incorrect');
      return;
    }

    setSession({ type: 'admin', user: data.admin });
    setActiveView('admin');
    setAdminForm({ email: '', password: '' });
    showToast('Admin login successful');
  };

  const handleStudentLogin = (event) => {
    event.preventDefault();
    const foundStudent = data.students.find(
      (student) =>
        student.email.toLowerCase() === studentLogin.email.toLowerCase() &&
        student.password === studentLogin.password
    );

    if (!foundStudent) {
      showToast('Student email or password is incorrect');
      return;
    }

    if (!foundStudent.verified) {
      setPendingOtp(foundStudent.otp || '');
      setOtpInput('');
      setSession({ type: 'student', user: foundStudent });
      setActiveView('student');
      showToast('Your account is not verified yet. Please enter OTP.');
      return;
    }

    setSession({ type: 'student', user: foundStudent });
    setStudentLogin({ email: '', password: '' });
    setActiveView('student');
    showToast('Student login successful');
  };

  const handleRegisterStudent = (event) => {
    event.preventDefault();

    const existing = data.students.some(
      (student) => student.email.toLowerCase() === studentRegister.email.toLowerCase()
    );

    if (existing) {
      showToast('This email is already registered');
      return;
    }

    const generatedOtp = String(Math.floor(100000 + Math.random() * 900000));
    const newStudent = {
      id: `student-${Date.now()}`,
      name: studentRegister.name,
      className: studentRegister.className,
      phone: studentRegister.phone,
      email: studentRegister.email,
      password: studentRegister.password,
      verified: false,
      otp: generatedOtp,
      joinedAt: new Date().toISOString(),
    };

    const nextData = {
      ...data,
      students: [newStudent, ...data.students],
    };

    setData(nextData);
    setPendingOtp(generatedOtp);
    setSession({ type: 'student', user: newStudent });
    setStudentRegister({
      name: '',
      className: 'Class 9',
      phone: '',
      email: '',
      password: '',
    });
    setActiveView('student');
    showToast(`OTP sent successfully: ${generatedOtp}`);
  };

  const handleVerifyOtp = () => {
    if (!session.user) return;

    const updatedStudent = { ...session.user, verified: true, otp: '' };
    const nextStudents = data.students.map((student) =>
      student.id === updatedStudent.id ? updatedStudent : student
    );

    setData({ ...data, students: nextStudents });
    setSession({ type: 'student', user: updatedStudent });
    setPendingOtp('');
    setOtpInput('');
    showToast('OTP verified successfully');
  };

  const handleAddNotice = (event) => {
    event.preventDefault();
    if (!noticeForm.title || !noticeForm.message) {
      showToast('Notice title and message are required');
      return;
    }

    const newNotice = {
      id: `notice-${Date.now()}`,
      title: noticeForm.title,
      message: noticeForm.message,
      date: new Date().toISOString(),
    };

    setData({ ...data, notices: [newNotice, ...data.notices] });
    setNoticeForm({ title: '', message: '' });
    showToast('Notice published successfully');
  };

  const handleAddHomework = async (event) => {
    event.preventDefault();

    if (!homeworkForm.title || !homeworkForm.instructions) {
      showToast('Homework title and instructions are required');
      return;
    }

    let fileUrl = '';
    let fileName = '';

    if (homeworkForm.file) {
      fileUrl = await readFileAsDataUrl(homeworkForm.file);
      fileName = homeworkForm.file.name;
    }

    const newHomework = {
      id: `homework-${Date.now()}`,
      title: homeworkForm.title,
      className: homeworkForm.className,
      subject: homeworkForm.subject,
      instructions: homeworkForm.instructions,
      date: new Date().toISOString(),
      attachments: fileUrl ? [{ fileName, fileUrl }] : [],
      submissions: [],
    };

    setData({ ...data, homework: [newHomework, ...data.homework] });
    setHomeworkForm({
      title: '',
      className: 'Class 9',
      subject: 'English',
      instructions: '',
      file: null,
    });
    showToast('Homework added successfully');
  };

  const handleAddTest = async (event) => {
    event.preventDefault();

    if (!testForm.title || !testForm.date || !testForm.instructions) {
      showToast('Please complete all test fields');
      return;
    }

    let fileUrl = '';
    let fileName = '';

    if (testForm.file) {
      fileUrl = await readFileAsDataUrl(testForm.file);
      fileName = testForm.file.name;
    }

    const newTest = {
      id: `test-${Date.now()}`,
      title: testForm.title,
      className: testForm.className,
      subject: testForm.subject,
      date: testForm.date,
      instructions: testForm.instructions,
      fileName,
      fileUrl,
    };

    setData({ ...data, tests: [newTest, ...data.tests] });
    setTestForm({
      title: '',
      className: 'Class 10',
      subject: 'English',
      date: '',
      instructions: '',
      file: null,
    });
    showToast('Test published successfully');
  };

  const handleHomeworkSubmit = async (event) => {
    event.preventDefault();
    if (!homeworkSubmission.homeworkId || !homeworkSubmission.file || !session.user) {
      showToast('Select a homework and upload a file');
      return;
    }

    const fileAsDataUrl = await readFileAsDataUrl(homeworkSubmission.file);
    const homeworkEntry = data.homework.find(
      (item) => item.id === homeworkSubmission.homeworkId
    );

    if (!homeworkEntry) {
      showToast('Selected homework not found');
      return;
    }

    const newSubmission = {
      id: `submission-${Date.now()}`,
      studentId: session.user.id,
      studentName: session.user.name,
      className: session.user.className,
      fileName: homeworkSubmission.file.name,
      fileUrl: fileAsDataUrl,
      submittedAt: new Date().toISOString(),
    };

    const nextHomework = data.homework.map((item) =>
      item.id === homeworkSubmission.homeworkId
        ? { ...item, submissions: [newSubmission, ...item.submissions] }
        : item
    );

    setData({ ...data, homework: nextHomework });
    setHomeworkSubmission({ homeworkId: '', title: '', file: null });
    showToast('Homework submitted successfully');
  };

  const logout = () => {
    setSession({ type: null, user: null });
    setActiveView('home');
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-wrap">
          <div className="brand-box">JT</div>
          <div>
            <p className="brand-name">Jaganath Tuition</p>
            <span className="brand-sub">Academic excellence with care</span>
          </div>
        </div>

        <nav className="nav">
          <button onClick={() => setActiveView('home')}>Home</button>
          <button onClick={() => setActiveView('courses')}>Courses</button>
          <button onClick={() => setActiveView('homework')}>Homework</button>
          <button onClick={() => setActiveView('tests')}>Tests</button>
          <button onClick={() => setActiveView('teacher')}>Teacher</button>
          <button onClick={() => setActiveView('contact')}>Contact</button>
        </nav>

        <div className="auth-buttons">
          {session.type ? (
            <>
              <span className="session-pill">
                {session.type === 'admin' ? 'Admin' : session.user?.name}
              </span>
              <button className="outline-btn" onClick={logout}>Logout</button>
            </>
          ) : (
            <>
              <button className="outline-btn" onClick={() => setActiveView('login')}>
                Student Login
              </button>
              <button className="solid-btn" onClick={() => setActiveView('admin-login')}>
                Admin Login
              </button>
            </>
          )}
        </div>
      </header>

      {toast && <div className="toast">{toast}</div>}

      {activeView === 'home' && (
        <main>
          <section className="hero">
            <div className="hero-text">
              <span className="eyebrow">Modern coaching for better futures</span>
              <h1>Quality education for Classes 9, 10 & 12</h1>
              <p>
                Jaganath Tuition provides focused academic guidance in English, Bengali,
                Social Science, Political Science, and Grammar with a strong discipline-focused
                learning environment.
              </p>
              <div className="cta-group">
                <button className="solid-btn" onClick={() => setActiveView('student')}>
                  Student Portal
                </button>
                <button className="outline-btn" onClick={() => setActiveView('courses')}>
                  Explore Courses
                </button>
              </div>
            </div>

            <div className="hero-card panel">
              <h3>Institute Details</h3>
              <ul>
                <li>Back Side of Budhon HS School</li>
                <li>Nivia Bazar, Karimganj, Assam</li>
                <li>Affiliated with Assam Board</li>
                <li>Mobile: 6001832566</li>
              </ul>
            </div>
          </section>

          <section className="notice-board panel">
            <div className="section-heading">
              <h2>Notice Board</h2>
            </div>
            <div className="notice-list">
              {data.notices.map((notice) => (
                <article key={notice.id} className="notice-item">
                  <div className="badge">Latest</div>
                  <h3>{notice.title}</h3>
                  <p>{notice.message}</p>
                  <small>{formatDate(notice.date)}</small>
                </article>
              ))}
            </div>
          </section>

          <section className="cards-grid" id="courses">
            <div className="section-heading wide">
              <h2>Subjects Offered</h2>
            </div>

            <div className="course-card panel">
              <h3>Class 9</h3>
              <p>English, Bengali, Social Science, Grammar</p>
            </div>
            <div className="course-card panel">
              <h3>Class 10</h3>
              <p>English, Bengali, Social Science, Grammar</p>
            </div>
            <div className="course-card panel">
              <h3>Class 12</h3>
              <p>English, Bengali, Political Science, Grammar</p>
            </div>
          </section>

          <section className="teacher-section panel" id="teacher">
            <div className="teacher-photo">AB</div>
            <div className="teacher-copy">
              <span className="eyebrow">Meet the Teacher</span>
              <h2>Alok Bhattacharjee</h2>
              <p>
                An experienced academic mentor committed to helping students improve their
                confidence, writing, practical understanding, and board exam performance.
              </p>
            </div>
          </section>
        </main>
      )}

      {activeView === 'courses' && (
        <main className="page-block">
          <div className="section-heading">
            <h2>Courses & Subjects</h2>
          </div>
          <div className="cards-grid three-col">
            <div className="panel info-card">
              <h3>Class 9</h3>
              <ul>
                <li>English</li>
                <li>Bengali</li>
                <li>Social Science</li>
                <li>Grammar</li>
              </ul>
            </div>
            <div className="panel info-card">
              <h3>Class 10</h3>
              <ul>
                <li>English</li>
                <li>Bengali</li>
                <li>Social Science</li>
                <li>Grammar</li>
              </ul>
            </div>
            <div className="panel info-card">
              <h3>Class 12</h3>
              <ul>
                <li>English</li>
                <li>Bengali</li>
                <li>Political Science</li>
                <li>Grammar</li>
              </ul>
            </div>
          </div>
        </main>
      )}

      {activeView === 'homework' && (
        <main className="page-block">
          <div className="section-heading space-between">
            <h2>Homework Center</h2>
            {session.type === 'admin' && (
              <button className="solid-btn" onClick={() => setActiveView('admin')}>
                Go to Admin Dashboard
              </button>
            )}
          </div>

          <div className="cards-grid three-col">
            {data.homework.map((item) => (
              <div className="panel homework-card" key={item.id}>
                <div className="mini-tag">{item.subject}</div>
                <h3>{item.title}</h3>
                <p className="muted">Class: {item.className}</p>
                <p>{item.instructions}</p>
                <small>{formatDate(item.date)}</small>

                {item.attachments.length > 0 && (
                  <a href={item.attachments[0].fileUrl} target="_blank" rel="noreferrer">
                    View Attachment
                  </a>
                )}

                {session.type === 'student' && (
                  <form
                    className="upload-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const fileInput = event.target.elements.file;
                      const file = fileInput.files[0];

                      if (file) {
                        setHomeworkSubmission({ homeworkId: item.id, title: item.title, file });
                        showToast('Homework selected. Submit now.');
                      }
                    }}
                  >
                    <input type="file" name="file" accept="image/*,.pdf" />
                    <button type="submit" className="solid-btn small">Select File</button>
                  </form>
                )}
              </div>
            ))}
          </div>

          {session.type === 'student' && homeworkSubmission.homeworkId && (
            <div className="panel submission-box">
              <h3>Submit Selected Homework</h3>
              <p>{homeworkSubmission.title}</p>
              <form onSubmit={handleHomeworkSubmit} className="inline-form">
                <input type="text" value={homeworkSubmission.title} readOnly />
                <button type="submit" className="solid-btn">Submit Homework</button>
              </form>
            </div>
          )}
        </main>
      )}

      {activeView === 'tests' && (
        <main className="page-block">
          <div className="section-heading">
            <h2>Tests & Assessments</h2>
          </div>
          <div className="cards-grid three-col">
            {data.tests.map((test) => (
              <div className="panel test-card" key={test.id}>
                <div className="mini-tag">{test.subject}</div>
                <h3>{test.title}</h3>
                <p className="muted">Class: {test.className}</p>
                <p>{test.instructions}</p>
                <small>Date: {test.date}</small>
                {test.fileUrl && (
                  <a href={test.fileUrl} target="_blank" rel="noreferrer">
                    View PDF/Image
                  </a>
                )}
              </div>
            ))}
          </div>
        </main>
      )}

      {activeView === 'teacher' && (
        <main className="page-block">
          <div className="panel teacher-profile-large">
            <div className="teacher-photo big">AB</div>
            <div>
              <span className="eyebrow">Teacher</span>
              <h2>Alok Bhattacharjee</h2>
              <p>
                A dedicated educator, mentor, and guide for students preparing for school and board
                examinations. He believes in disciplined learning, consistent guidance, and strong
                academic support for every child.
              </p>
              <ul className="teacher-meta">
                <li>Address: Back Side of Budhon HS School, Nivia Bazar, Karimganj, Assam</li>
                <li>Website Owner: Anirban Bhattacharjee</li>
                <li>Phone: 6001832566</li>
              </ul>
            </div>
          </div>
        </main>
      )}

      {activeView === 'contact' && (
        <main className="page-block">
          <div className="panel contact-panel">
            <h2>Contact Jaganath Tuition</h2>
            <ul>
              <li>Address: Back Side of Budhon HS School, Nivia Bazar, Karimganj, Assam</li>
              <li>Phone: 6001832566</li>
              <li>Email: info@jaganathtuition.in</li>
              <li>Website Owner: Anirban Bhattacharjee</li>
            </ul>
          </div>
        </main>
      )}

      {activeView === 'login' && (
        <main className="page-block auth-wrap">
          <div className="panel auth-box">
            <h2>Student Login</h2>
            <form onSubmit={handleStudentLogin} className="auth-form">
              <input
                type="email"
                placeholder="Email"
                value={studentLogin.email}
                onChange={(event) =>
                  setStudentLogin({ ...studentLogin, email: event.target.value })
                }
              />
              <input
                type="password"
                placeholder="Password"
                value={studentLogin.password}
                onChange={(event) =>
                  setStudentLogin({ ...studentLogin, password: event.target.value })
                }
              />
              <button className="solid-btn" type="submit">Login</button>
            </form>

            <div className="divider">or</div>

            <h3>Register New Student</h3>
            <form onSubmit={handleRegisterStudent} className="auth-form">
              <input
                type="text"
                placeholder="Full Name"
                value={studentRegister.name}
                onChange={(event) =>
                  setStudentRegister({ ...studentRegister, name: event.target.value })
                }
              />
              <select
                value={studentRegister.className}
                onChange={(event) =>
                  setStudentRegister({ ...studentRegister, className: event.target.value })
                }
              >
                <option>Class 9</option>
                <option>Class 10</option>
                <option>Class 12</option>
              </select>
              <input
                type="tel"
                placeholder="Phone Number"
                value={studentRegister.phone}
                onChange={(event) =>
                  setStudentRegister({ ...studentRegister, phone: event.target.value })
                }
              />
              <input
                type="email"
                placeholder="Email"
                value={studentRegister.email}
                onChange={(event) =>
                  setStudentRegister({ ...studentRegister, email: event.target.value })
                }
              />
              <input
                type="password"
                placeholder="Password"
                value={studentRegister.password}
                onChange={(event) =>
                  setStudentRegister({ ...studentRegister, password: event.target.value })
                }
              />
              <button className="solid-btn" type="submit">Register & Send OTP</button>
            </form>
          </div>
        </main>
      )}

      {activeView === 'admin-login' && (
        <main className="page-block auth-wrap">
          <div className="panel auth-box">
            <h2>Admin Login</h2>
            <form onSubmit={handleAdminLogin} className="auth-form">
              <input
                type="email"
                placeholder="Admin Email"
                value={adminForm.email}
                onChange={(event) => setAdminForm({ ...adminForm, email: event.target.value })}
              />
              <input
                type="password"
                placeholder="Password"
                value={adminForm.password}
                onChange={(event) => setAdminForm({ ...adminForm, password: event.target.value })}
              />
              <button className="solid-btn" type="submit">Login</button>
            </form>
          </div>
        </main>
      )}

      {activeView === 'admin' && session.type === 'admin' && (
        <main className="page-block admin-layout">
          <div className="panel admin-panel">
            <div className="section-heading">
              <h2>Admin Dashboard</h2>
            </div>

            <div className="admin-section">
              <h3>Publish Notice</h3>
              <form onSubmit={handleAddNotice} className="stack-form">
                <input
                  type="text"
                  placeholder="Notice Title"
                  value={noticeForm.title}
                  onChange={(event) => setNoticeForm({ ...noticeForm, title: event.target.value })}
                />
                <textarea
                  rows="4"
                  placeholder="Message"
                  value={noticeForm.message}
                  onChange={(event) =>
                    setNoticeForm({ ...noticeForm, message: event.target.value })
                  }
                />
                <button className="solid-btn" type="submit">Publish Notice</button>
              </form>
            </div>

            <div className="admin-section">
              <h3>Add Homework</h3>
              <form onSubmit={handleAddHomework} className="stack-form">
                <input
                  type="text"
                  placeholder="Homework title"
                  value={homeworkForm.title}
                  onChange={(event) =>
                    setHomeworkForm({ ...homeworkForm, title: event.target.value })
                  }
                />
                <select
                  value={homeworkForm.className}
                  onChange={(event) =>
                    setHomeworkForm({ ...homeworkForm, className: event.target.value })
                  }
                >
                  <option>Class 9</option>
                  <option>Class 10</option>
                  <option>Class 12</option>
                </select>
                <select
                  value={homeworkForm.subject}
                  onChange={(event) =>
                    setHomeworkForm({ ...homeworkForm, subject: event.target.value })
                  }
                >
                  <option>English</option>
                  <option>Bengali</option>
                  <option>Social Science</option>
                  <option>Political Science</option>
                  <option>Grammar</option>
                </select>
                <textarea
                  rows="4"
                  placeholder="Instructions"
                  value={homeworkForm.instructions}
                  onChange={(event) =>
                    setHomeworkForm({ ...homeworkForm, instructions: event.target.value })
                  }
                />
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(event) =>
                    setHomeworkForm({ ...homeworkForm, file: event.target.files[0] || null })
                  }
                />
                <button className="solid-btn" type="submit">Add Homework</button>
              </form>
            </div>

            <div className="admin-section">
              <h3>Publish Test</h3>
              <form onSubmit={handleAddTest} className="stack-form">
                <input
                  type="text"
                  placeholder="Test title"
                  value={testForm.title}
                  onChange={(event) => setTestForm({ ...testForm, title: event.target.value })}
                />
                <select
                  value={testForm.className}
                  onChange={(event) =>
                    setTestForm({ ...testForm, className: event.target.value })
                  }
                >
                  <option>Class 9</option>
                  <option>Class 10</option>
                  <option>Class 12</option>
                </select>
                <select
                  value={testForm.subject}
                  onChange={(event) =>
                    setTestForm({ ...testForm, subject: event.target.value })
                  }
                >
                  <option>English</option>
                  <option>Bengali</option>
                  <option>Social Science</option>
                  <option>Political Science</option>
                  <option>Grammar</option>
                </select>
                <input
                  type="date"
                  value={testForm.date}
                  onChange={(event) => setTestForm({ ...testForm, date: event.target.value })}
                />
                <textarea
                  rows="4"
                  placeholder="Instructions"
                  value={testForm.instructions}
                  onChange={(event) =>
                    setTestForm({ ...testForm, instructions: event.target.value })
                  }
                />
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(event) => setTestForm({ ...testForm, file: event.target.files[0] || null })}
                />
                <button className="solid-btn" type="submit">Publish Test</button>
              </form>
            </div>
          </div>

          <div className="panel admin-side">
            <h3>Student Records</h3>
            <div className="student-list">
              {data.students.map((student) => (
                <div className="student-item" key={student.id}>
                  <strong>{student.name}</strong>
                  <span>{student.className}</span>
                  <span>{student.email}</span>
                  <span>{student.verified ? 'Verified' : 'Pending OTP'}</span>
                </div>
              ))}
            </div>
          </div>
        </main>
      )}

      {activeView === 'student' && session.type === 'student' && currentStudent && (
        <main className="page-block student-layout">
          <div className="panel student-panel">
            <h2>Welcome, {currentStudent.name}</h2>
            <p>Class: {currentStudent.className}</p>
            <p>Phone: {currentStudent.phone}</p>
            <p>Email: {currentStudent.email}</p>

            {!currentStudent.verified && (
              <div className="otp-box">
                <p>OTP is required for verification.</p>
                <input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otpInput}
                  onChange={(event) => setOtpInput(event.target.value)}
                />
                <div className="otp-row">
                  <button className="solid-btn" onClick={handleVerifyOtp}>
                    Verify OTP
                  </button>
                  <span>Generated OTP: {pendingOtp || 'Not generated yet'}</span>
                </div>
              </div>
            )}

            {currentStudent.verified && (
              <div className="student-actions">
                <button className="solid-btn" onClick={() => setActiveView('homework')}>
                  View Homework
                </button>
                <button className="outline-btn" onClick={() => setActiveView('tests')}>
                  View Tests
                </button>
              </div>
            )}
          </div>

          <div className="panel student-side">
            <h3>Submitted Homework</h3>
            {data.homework.flatMap((item) =>
              item.submissions.filter((submission) => submission.studentId === currentStudent.id)
            ).length === 0 ? (
              <p>No homework submitted yet.</p>
            ) : (
              <div className="submission-list">
                {data.homework.flatMap((item) =>
                  item.submissions.filter((submission) => submission.studentId === currentStudent.id)
                ).map((submission) => (
                  <div key={submission.id} className="student-submission">
                    <strong>{submission.fileName}</strong>
                    <a href={submission.fileUrl} target="_blank" rel="noreferrer">
                      Open file
                    </a>
                    <small>{formatDate(submission.submittedAt)}</small>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      )}
    </div>
  );
}

export default App;
