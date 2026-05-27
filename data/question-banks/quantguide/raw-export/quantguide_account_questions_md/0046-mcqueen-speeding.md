# QuantGuide Question

## 46. McQueen Speeding

**Metadata**

- ID: `lcY465rCP6NOg1buLsVU`
- URL: https://www.quantguide.io/questions/mcqueen-speeding
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: tm
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-29 09:26:08 America/New_York
- Last Edited By: Gabe

### 题干

Lightning McQueen, Doc Hudson, and Chick Hicks all race in the Piston Cup to run it back. They race around an $1$ kilometer track. It turns out that Lightning McQueen is first, Doc Hudson is second, and Chick Hicks is third. Lightning McQueen finishes his lap $200$ meters ahead of Doc Hudson. Furthermore, Doc Hudson finishes his lap $200$ meters ahead of Chick Hicks. Assuming that each car moves with a constant speed, at the moment when Lightning McQueen finishes his lap, how many meters is Chick Hicks away from finishing his lap?

### Hint

To solve this, we must obtain the relative speed of Lightning McQueen to Chick Hicks. Let $s$ be the speed Chick Hicks. How fast does Doc Hudson move relative to Chick Hicks?

### 解答

To solve this, we must obtain the relative speed of Lightning McQueen to Chick Hicks. Let $s$ be the speed Chick Hicks. Doc Hudson must move at a speed of $\dfrac{5}{4}s$, as Doc Hudson moves $1000$ meters in the time that Chick Hicks moves $800$ meters. Similarly, Lightning McQueen must move at a rate of $\dfrac{5}{4}\left(\dfrac{5}{4}s\right) = \dfrac{25}{16}s$ by the same logic of comparing his distance travelled to Doc Hudson. 


$$$$

Since Lightning McQueen moves at a speed $\dfrac{25}{16}$ times as large as Chick Hicks, this says that if Lightning McQueen covers a distance $d$, Chick Hicks covers a distance of $\dfrac{16}{25}d$. In particular, $d = 1000$ here, so Chick Hicks has travelled $640$ meters in the lap, meaning he is $360$ meters away from finishing his lap.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "360"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "lcY465rCP6NOg1buLsVU",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-29 09:26:08 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 332566,
    "source": "tm",
    "status": "published",
    "tags": [],
    "title": "McQueen Speeding",
    "topic": "brainteasers",
    "urlEnding": "mcqueen-speeding",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "lcY465rCP6NOg1buLsVU",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "McQueen Speeding",
    "topic": "brainteasers",
    "urlEnding": "mcqueen-speeding"
  }
}
```
