from sqlalchemy import inspect, text

from app.database import engine


USER_TABLE_COLUMNS = {
    "is_email_verified": "BOOLEAN NOT NULL DEFAULT 0",
    "email_verification_token": "VARCHAR(255) NULL",
    "email_verification_expires_at": "DATETIME NULL",
    "password_reset_token": "VARCHAR(255) NULL",
    "password_reset_expires_at": "DATETIME NULL",
}


def migrate_user_lifecycle_columns() -> None:
    existing_columns = {
        column["name"] for column in inspect(engine).get_columns("user_table")
    }

    with engine.begin() as connection:
        for column_name, column_definition in USER_TABLE_COLUMNS.items():
            if column_name in existing_columns:
                continue

            connection.execute(
                text(
                    f"ALTER TABLE user_table ADD COLUMN "
                    f"{column_name} {column_definition}"
                )
            )
            print(f"Added user_table.{column_name}")


if __name__ == "__main__":
    migrate_user_lifecycle_columns()
