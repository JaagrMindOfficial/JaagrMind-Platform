require('dotenv').config();
const bcrypt = require('bcryptjs');
const knex = require('knex');

const db = knex({
    client: 'pg',
    connection: {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME || 'postgres',
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: { rejectUnauthorized: false }
    }
});

const defaultAssessment = {
    title: 'Student Wellness Assessment',
    description: 'A comprehensive 32-question assessment to understand your current mental wellness and skill areas.',
    is_default: true,
    time_per_question: 30,
    total_time: 15,
    section_buckets: true,
    inactivity_alert_time: 40,
    inactivity_end_time: 120,
    questions: JSON.stringify([
        { text: 'I feel mentally tired before I begin my work', section: 'A', sectionName: 'Focus & Attention', isPositive: false, options: [{ label: 'Not true for me', marks: 1 }, { label: 'Sometimes true', marks: 2 }, { label: 'Often true', marks: 3 }, { label: 'Almost always true', marks: 4 }] },
        { text: 'I delay starting tasks that feel big or difficult.', section: 'A', sectionName: 'Focus & Attention', isPositive: false, options: [{ label: 'Not true for me', marks: 1 }, { label: 'Sometimes true', marks: 2 }, { label: 'Often true', marks: 3 }, { label: 'Almost always true', marks: 4 }] },
        { text: 'My mind keeps jumping between thoughts when I try to study.', section: 'A', sectionName: 'Focus & Attention', isPositive: false, options: [{ label: 'Not true for me', marks: 1 }, { label: 'Sometimes true', marks: 2 }, { label: 'Often true', marks: 3 }, { label: 'Almost always true', marks: 4 }] },
        { text: 'I feel pressure or stress when I need to concentrate.', section: 'A', sectionName: 'Focus & Attention', isPositive: false, options: [{ label: 'Not true for me', marks: 1 }, { label: 'Sometimes true', marks: 2 }, { label: 'Often true', marks: 3 }, { label: 'Almost always true', marks: 4 }] },
        { text: 'I feel overwhelmed when I have many things to do.', section: 'A', sectionName: 'Focus & Attention', isPositive: false, options: [{ label: 'Not true for me', marks: 1 }, { label: 'Sometimes true', marks: 2 }, { label: 'Often true', marks: 3 }, { label: 'Almost always true', marks: 4 }] },
        { text: 'Even simple work feels exhausting sometimes.', section: 'A', sectionName: 'Focus & Attention', isPositive: false, options: [{ label: 'Not true for me', marks: 1 }, { label: 'Sometimes true', marks: 2 }, { label: 'Often true', marks: 3 }, { label: 'Almost always true', marks: 4 }] },
        { text: 'I can stay focused once I begin a task.', section: 'A', sectionName: 'Focus & Attention', isPositive: true, options: [{ label: 'Not true for me', marks: 4 }, { label: 'Sometimes true', marks: 3 }, { label: 'Often true', marks: 2 }, { label: 'Almost always true', marks: 1 }] },
        { text: 'I feel calm and steady while working on something.', section: 'A', sectionName: 'Focus & Attention', isPositive: true, options: [{ label: 'Not true for me', marks: 4 }, { label: 'Sometimes true', marks: 3 }, { label: 'Often true', marks: 2 }, { label: 'Almost always true', marks: 1 }] },

        { text: 'I am very hard on myself when I make mistakes.', section: 'B', sectionName: 'Self-Esteem & Inner Confidence', isPositive: false, options: [{ label: 'Not true for me', marks: 1 }, { label: 'Sometimes true', marks: 2 }, { label: 'Often true', marks: 3 }, { label: 'Almost always true', marks: 4 }] },
        { text: 'I compare myself to others and feel less capable.', section: 'B', sectionName: 'Self-Esteem & Inner Confidence', isPositive: false, options: [{ label: 'Not true for me', marks: 1 }, { label: 'Sometimes true', marks: 2 }, { label: 'Often true', marks: 3 }, { label: 'Almost always true', marks: 4 }] },
        { text: 'I doubt my abilities even when I try sincerely.', section: 'B', sectionName: 'Self-Esteem & Inner Confidence', isPositive: false, options: [{ label: 'Not true for me', marks: 1 }, { label: 'Sometimes true', marks: 2 }, { label: 'Often true', marks: 3 }, { label: 'Almost always true', marks: 4 }] },
        { text: 'I feel disappointed in myself easily.', section: 'B', sectionName: 'Self-Esteem & Inner Confidence', isPositive: false, options: [{ label: 'Not true for me', marks: 1 }, { label: 'Sometimes true', marks: 2 }, { label: 'Often true', marks: 3 }, { label: 'Almost always true', marks: 4 }] },
        { text: 'I replay my mistakes in my mind for a long time.', section: 'B', sectionName: 'Self-Esteem & Inner Confidence', isPositive: false, options: [{ label: 'Not true for me', marks: 1 }, { label: 'Sometimes true', marks: 2 }, { label: 'Often true', marks: 3 }, { label: 'Almost always true', marks: 4 }] },
        { text: 'I judge myself more harshly than others judge me.', section: 'B', sectionName: 'Self-Esteem & Inner Confidence', isPositive: false, options: [{ label: 'Not true for me', marks: 1 }, { label: 'Sometimes true', marks: 2 }, { label: 'Often true', marks: 3 }, { label: 'Almost always true', marks: 4 }] },
        { text: 'I feel okay about myself even when I don\'t do well.', section: 'B', sectionName: 'Self-Esteem & Inner Confidence', isPositive: true, options: [{ label: 'Not true for me', marks: 4 }, { label: 'Sometimes true', marks: 3 }, { label: 'Often true', marks: 2 }, { label: 'Almost always true', marks: 1 }] },
        { text: 'I can encourage myself after making a mistake.', section: 'B', sectionName: 'Self-Esteem & Inner Confidence', isPositive: true, options: [{ label: 'Not true for me', marks: 4 }, { label: 'Sometimes true', marks: 3 }, { label: 'Often true', marks: 2 }, { label: 'Almost always true', marks: 1 }] },

        { text: 'I hesitate to speak up even when I know the answer.', section: 'C', sectionName: 'Social Confidence & Interaction', isPositive: false, options: [{ label: 'Not true for me', marks: 1 }, { label: 'Sometimes true', marks: 2 }, { label: 'Often true', marks: 3 }, { label: 'Almost always true', marks: 4 }] },
        { text: 'I worry about what others think of me.', section: 'C', sectionName: 'Social Confidence & Interaction', isPositive: false, options: [{ label: 'Not true for me', marks: 1 }, { label: 'Sometimes true', marks: 2 }, { label: 'Often true', marks: 3 }, { label: 'Almost always true', marks: 4 }] },
        { text: 'I feel awkward or uncomfortable in group situations.', section: 'C', sectionName: 'Social Confidence & Interaction', isPositive: false, options: [{ label: 'Not true for me', marks: 1 }, { label: 'Sometimes true', marks: 2 }, { label: 'Often true', marks: 3 }, { label: 'Almost always true', marks: 4 }] },
        { text: 'I avoid participating in class discussions.', section: 'C', sectionName: 'Social Confidence & Interaction', isPositive: false, options: [{ label: 'Not true for me', marks: 1 }, { label: 'Sometimes true', marks: 2 }, { label: 'Often true', marks: 3 }, { label: 'Almost always true', marks: 4 }] },
        { text: 'I stay quiet to avoid saying the wrong thing.', section: 'C', sectionName: 'Social Confidence & Interaction', isPositive: false, options: [{ label: 'Not true for me', marks: 1 }, { label: 'Sometimes true', marks: 2 }, { label: 'Often true', marks: 3 }, { label: 'Almost always true', marks: 4 }] },
        { text: 'I feel left out or invisible at school.', section: 'C', sectionName: 'Social Confidence & Interaction', isPositive: false, options: [{ label: 'Not true for me', marks: 1 }, { label: 'Sometimes true', marks: 2 }, { label: 'Often true', marks: 3 }, { label: 'Almost always true', marks: 4 }] },
        { text: 'I feel comfortable sharing my thoughts in groups.', section: 'C', sectionName: 'Social Confidence & Interaction', isPositive: true, options: [{ label: 'Not true for me', marks: 4 }, { label: 'Sometimes true', marks: 3 }, { label: 'Often true', marks: 2 }, { label: 'Almost always true', marks: 1 }] },
        { text: 'I feel confident interacting with classmates.', section: 'C', sectionName: 'Social Confidence & Interaction', isPositive: true, options: [{ label: 'Not true for me', marks: 4 }, { label: 'Sometimes true', marks: 3 }, { label: 'Often true', marks: 2 }, { label: 'Almost always true', marks: 1 }] },

        { text: 'I use my phone or screen when I feel bored or restless.', section: 'D', sectionName: 'Digital Hygiene & Self-Control', isPositive: false, options: [{ label: 'Not true for me', marks: 1 }, { label: 'Sometimes true', marks: 2 }, { label: 'Often true', marks: 3 }, { label: 'Almost always true', marks: 4 }] },
        { text: 'I lose track of time while scrolling or gaming.', section: 'D', sectionName: 'Digital Hygiene & Self-Control', isPositive: false, options: [{ label: 'Not true for me', marks: 1 }, { label: 'Sometimes true', marks: 2 }, { label: 'Often true', marks: 3 }, { label: 'Almost always true', marks: 4 }] },
        { text: 'I feel irritated when my screen time is limited.', section: 'D', sectionName: 'Digital Hygiene & Self-Control', isPositive: false, options: [{ label: 'Not true for me', marks: 1 }, { label: 'Sometimes true', marks: 2 }, { label: 'Often true', marks: 3 }, { label: 'Almost always true', marks: 4 }] },
        { text: 'I check my phone even when I know I should not.', section: 'D', sectionName: 'Digital Hygiene & Self-Control', isPositive: false, options: [{ label: 'Not true for me', marks: 1 }, { label: 'Sometimes true', marks: 2 }, { label: 'Often true', marks: 3 }, { label: 'Almost always true', marks: 4 }] },
        { text: 'I use screens to avoid uncomfortable feelings or tasks.', section: 'D', sectionName: 'Digital Hygiene & Self-Control', isPositive: false, options: [{ label: 'Not true for me', marks: 1 }, { label: 'Sometimes true', marks: 2 }, { label: 'Often true', marks: 3 }, { label: 'Almost always true', marks: 4 }] },
        { text: 'I find it hard to stop using screens once I start.', section: 'D', sectionName: 'Digital Hygiene & Self-Control', isPositive: false, options: [{ label: 'Not true for me', marks: 1 }, { label: 'Sometimes true', marks: 2 }, { label: 'Often true', marks: 3 }, { label: 'Almost always true', marks: 4 }] },
        { text: 'I can put my phone away when I decide to.', section: 'D', sectionName: 'Digital Hygiene & Self-Control', isPositive: true, options: [{ label: 'Not true for me', marks: 4 }, { label: 'Sometimes true', marks: 3 }, { label: 'Often true', marks: 2 }, { label: 'Almost always true', marks: 1 }] },
        { text: 'I feel comfortable being offline for some time.', section: 'D', sectionName: 'Digital Hygiene & Self-Control', isPositive: true, options: [{ label: 'Not true for me', marks: 4 }, { label: 'Sometimes true', marks: 3 }, { label: 'Often true', marks: 2 }, { label: 'Almost always true', marks: 1 }] }
    ]),
    buckets: JSON.stringify({
        pathwayThresholds: {
            stableMax: 14,
            emergingMin: 15,
            emergingMax: 22,
            supportMin: 23
        },
        dailyActivitySlots: 4
    }),
    custom_sections: JSON.stringify([
        { key: 'A', name: 'Focus & Attention', skillBucketKey: 'ATTN_STABILITY' },
        { key: 'B', name: 'Self-Esteem & Inner Confidence', skillBucketKey: 'SELF_SAFETY' },
        { key: 'C', name: 'Social Confidence & Interaction', skillBucketKey: 'SOCIAL_COMFORT' },
        { key: 'D', name: 'Digital Hygiene & Self-Control', skillBucketKey: 'LOAD_REGULATION' }
    ]),
    is_active: true,
    created_at: new Date()
};

const seedDatabase = async () => {
    try {
        await db.raw('SELECT NOW()');
        console.log('Connected to Supabase PostgreSQL');

        const existingAssessment = await db('assessments').where('is_default', true).first();
        if (existingAssessment) {
            console.log('Default assessment already exists. Updating...');
            await db('assessments').where('id', existingAssessment.id).update(defaultAssessment);
            console.log('Default assessment updated!');
        } else {
            await db('assessments').insert(defaultAssessment);
            console.log('Default 32-question assessment created!');
        }

        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;

        const existingAdmin = await db('admins').where('email', adminEmail.toLowerCase()).first();
        if (!existingAdmin) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(adminPassword, salt);
            await db('admins').insert({
                email: adminEmail.toLowerCase(),
                password: hashedPassword,
                name: 'JaagrMind Admin',
                role: 'admin',
                created_at: new Date()
            });
            console.log(`Default admin created: ${adminEmail}`);
        } else {
            console.log('Admin already exists');
        }

        console.log('\nDatabase seeding completed!');
        console.log('\nLogin Credentials:');
        console.log(`   Admin Email: ${adminEmail}`);
        console.log(`   Admin Password: ${adminPassword}`);

        process.exit(0);
    } catch (error) {
        console.error('Seeding error:', error);
        process.exit(1);
    }
};

seedDatabase();
