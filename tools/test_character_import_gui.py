import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock

from character_import_gui import (
    EmoraApiClient,
    ImportItem,
    find_cover,
    load_import_item,
    parse_character_card,
)


def sample_card(name: str = "Nana") -> dict:
    return {
        "spec": "chara_card_v2",
        "spec_version": "2.0",
        "data": {
            "name": name,
            "description": "Description",
            "personality": "Personality",
            "scenario": "Scenario",
            "system_prompt": "System",
            "post_history_instructions": "Post",
            "first_mes": "Hello",
            "alternate_greetings": ["Hi", ""],
            "mes_example": "Example",
            "tags": ["Anime", ""],
            "avatar": "",
        },
    }


class CharacterImportGuiTests(unittest.TestCase):
    def test_parse_matches_admin_import_contract(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "card.json"
            path.write_text(json.dumps(sample_card()), encoding="utf-8")
            name, version, data, _ = parse_character_card(path)

            self.assertEqual(name, "Nana")
            self.assertEqual(version, "2.0")
            self.assertEqual(data["greetings"], ["Hello", "Hi"])
            self.assertEqual(data["mes_example"], [{"user": "", "character": "Example"}])
            self.assertEqual(data["tags"], ["Anime"])
            self.assertEqual(
                data["prompt"],
                "Description\n\nPersonality\n\nScenario\n\nSystem\n\nPost",
            )

    def test_cover_png_is_auto_detected(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            json_path = folder / "Nana_v2.0_character.json"
            json_path.write_text(json.dumps(sample_card()), encoding="utf-8")
            cover_path = folder / "cover.png"
            cover_path.write_bytes(b"png")

            item = load_import_item(json_path)

            self.assertTrue(item.is_valid)
            self.assertEqual(item.cover_path, cover_path.resolve())

    def test_local_avatar_has_priority(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            card = sample_card()
            card["data"]["avatar"] = "portrait.webp"
            json_path = folder / "card.json"
            json_path.write_text(json.dumps(card), encoding="utf-8")
            avatar_path = folder / "portrait.webp"
            avatar_path.write_bytes(b"webp")
            (folder / "cover.png").write_bytes(b"png")

            self.assertEqual(find_cover(json_path, card, "Nana"), avatar_path.resolve())

    def test_invalid_spec_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "card.json"
            card = sample_card()
            card["spec"] = "other"
            path.write_text(json.dumps(card), encoding="utf-8")

            with self.assertRaisesRegex(ValueError, "chara_card_v2"):
                parse_character_card(path)

    def test_upload_cover_registers_asset(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            cover = Path(directory) / "cover.png"
            cover.write_bytes(b"png")
            client = EmoraApiClient("https://example.test/api", "token")
            client.post = Mock(
                side_effect=[
                    {
                        "url": "https://storage.example.test/upload",
                        "key": "characters/Nana/gallery/cover.png",
                        "fields": {"key": "characters/Nana/gallery/cover.png", "policy": "masked"},
                    },
                    {"asset": {"id": 321}},
                ]
            )
            upload_response = Mock(ok=True, status_code=204)
            client.session.post = Mock(return_value=upload_response)

            asset_id = client.upload_cover(cover, "Nana")

            self.assertEqual(asset_id, 321)
            self.assertEqual(client.post.call_args_list[0].args[0], "/admin/media/upload-policy")
            self.assertEqual(client.post.call_args_list[1].args[0], "/admin/media/upload")
            client.close()

    def test_create_character_uses_registered_cover_asset(self) -> None:
        client = EmoraApiClient("https://example.test/api", "token")
        client.post = Mock(return_value={"id": 12})
        item = ImportItem(
            item_id="item",
            json_path=Path("card.json"),
            name="Nana",
            version="2.0",
            data={"name": "Nana"},
            cover_path=Path("cover.png"),
            asset_id=321,
        )

        client.create_character(item)

        path, body = client.post.call_args.args[:2]
        self.assertEqual(path, "/admin/characters/create")
        self.assertEqual(body["cover_asset_id"], 321)
        self.assertEqual(body["assets"][0]["asset_id"], 321)
        self.assertEqual(body["assets"][0]["role"], "cover")
        client.close()


if __name__ == "__main__":
    unittest.main()
