# QuantGuide Question

## 242. Big Mod II

**Metadata**

- ID: `m6drnbv68PUeeHX6SfZM`
- URL: https://www.quantguide.io/questions/big-mod-ii
- Topic: pure math
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Belvedere Trading
- Source: belv edited
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: 3
- Last Edited: 2023-9-30 23:21:15 America/New_York
- Last Edited By: Gabe

### 题干

Compute $15^{2021} \hspace{3pt} \text{mod} \hspace{3pt} 17$.

### Hint

Note that $15 \equiv -2 \hspace{3pt} \text{mod} \hspace{3pt} 17$, so we can say that $15^{2021} \hspace{3pt} \text{mod} \hspace{3pt} 17 = (-2)^{2021} \hspace{3pt} \text{mod} \hspace{3pt} 17$. Consider some powers of $2$.

### 解答

Note that $15 \equiv -2 \hspace{3pt} \text{mod} \hspace{3pt} 17$, so we can say that $15^{2021} \hspace{3pt} \text{mod} \hspace{3pt} 17 = (-2)^{2021} \hspace{3pt} \text{mod} \hspace{3pt} 17$. Since $(-2)^4 = 16$, this is desirable, as $16 \equiv -1 \hspace{3pt} \text{mod} \hspace{3pt} 17$, so we can write the above as $$\left[(-2)^4\right]^{505} \cdot (-2) \hspace{3pt} \text{mod} \hspace{3pt} 17 = (-1)^{505} \cdot (-2) \hspace{3pt} \text{mod} \hspace{3pt} 17 = 2$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2"
    ],
    "companies": [
      {
        "company": "Belvedere Trading"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "m6drnbv68PUeeHX6SfZM",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 23:21:15 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1907773,
    "source": "belv edited",
    "status": "published",
    "tags": [],
    "title": "Big Mod II",
    "topic": "pure math",
    "urlEnding": "big-mod-ii",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "Belvedere Trading"
      }
    ],
    "difficulty": "easy",
    "id": "m6drnbv68PUeeHX6SfZM",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Big Mod II",
    "topic": "pure math",
    "urlEnding": "big-mod-ii"
  }
}
```
