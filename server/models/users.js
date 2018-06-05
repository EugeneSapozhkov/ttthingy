const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let userSchema = Schema({
    id: {
        type: String,
        required: true,
        unique: true,
    },
    team_id: String,
    name: String,
    deleted: Boolean,
    color: String,
    real_name: String,
    tz: String,
    tz_label: String,
    tz_offset: Number,
    profile: Schema.Types.Mixed,
    is_admin: Boolean,
    is_owner: Boolean,
    is_primary_owner: Boolean,
    is_restricted: Boolean,
    is_ultra_restricted: Boolean,
    is_bot: Boolean,
    updated: Number,
    is_app_user: Boolean
}, {
    strict: false,
});

mongoose.model('User', userSchema);