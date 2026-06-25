import pandas as pd

df = pd.DataFrame({
    "name": ["Alice", "Bob", None, "Eve"],
    "age": [25, None, 30, 22]
})

print("Before cleaning:\n", df)

# Drop rows with missing values
df_clean = df.dropna()
print("\nAfter dropna:\n", df_clean)
