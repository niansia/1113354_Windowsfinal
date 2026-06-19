import unittest

from fusion_voice_server import _write_response_body


class DisconnectingWriter:
    def write(self, _body):
        raise ConnectionAbortedError(10053, "client disconnected")


class BrokenWriter:
    def write(self, _body):
        raise RuntimeError("unexpected write failure")


class HttpResponseTests(unittest.TestCase):
    def test_ignores_client_disconnect_while_writing_health_response(self):
        _write_response_body(DisconnectingWriter(), b"{}")

    def test_preserves_unexpected_response_write_failures(self):
        with self.assertRaises(RuntimeError):
            _write_response_body(BrokenWriter(), b"{}")


if __name__ == "__main__":
    unittest.main()
