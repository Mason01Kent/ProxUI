"""VNC tickets must expire and be usable only once."""

from unittest.mock import patch

import app


def test_vnc_session_can_only_be_redeemed_once():
    with app.vnc_sessions_lock:
        app.vnc_sessions["one-use"] = {"created_at": 1000}
    with patch("app.time.time", return_value=1001):
        assert app.take_vnc_session("one-use") == {"created_at": 1000}
        assert app.take_vnc_session("one-use") is None


def test_expired_vnc_session_is_rejected_and_removed():
    with app.vnc_sessions_lock:
        app.vnc_sessions["expired"] = {"created_at": 1000}
    with patch("app.time.time", return_value=1000 + app.VNC_SESSION_TIMEOUT + 1):
        assert app.take_vnc_session("expired") is None
        assert "expired" not in app.vnc_sessions
