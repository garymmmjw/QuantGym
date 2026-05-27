# QuantGuide Question

## 507. Temperature Conversion

**Metadata**

- ID: `AtfFr3tJG0UrebygGdGx`
- URL: https://www.quantguide.io/questions/temperature-conversion
- Topic: statistics
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-2 09:51:14 America/New_York
- Last Edited By: Gabe

### 题干

In June, New York City's daily maximum temperature has a mean of 80$^{\circ}$F and standard deviation of 5$^{\circ}$F. What is the absolute difference in mean and variance in $^{\circ}$C? Round your answer to the nearest hundredth.

### Hint

Recall that the conversion formula between the units is $C = \frac{5}{9}(F-32)$ where $F$ denotes temperature in $^{\circ}$F and C denotes temperature in $^{\circ}$C.

### 解答

Let $F$ denote temperature in $^{\circ}$F and C denote temperature in $^{\circ}$C. Recall that the conversion formula between the units is: 

$$C = \frac{5}{9}(F-32)$$

Thus:
$$E[C] = \frac{5}{9} \times E[F] - \frac{5}{9} \times 32 = \frac{5}{9} \times 80 - \frac{5}{9} \times 32 \approx 26.67^{\circ} \text{C}$$

$$V[C] = (\frac{5}{9})^2 \times V[F] = (\frac{5}{9})^2 \times 25 \approx 7.72^{\circ} \text{C}$$

$$E[C] - V[C] \approx 26.67 - 7.72 = 18.95$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "18.95"
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "AtfFr3tJG0UrebygGdGx",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-2 09:51:14 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4047578,
    "source": "",
    "status": "published",
    "tags": [],
    "title": "Temperature Conversion",
    "topic": "statistics",
    "urlEnding": "temperature-conversion",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "AtfFr3tJG0UrebygGdGx",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Temperature Conversion",
    "topic": "statistics",
    "urlEnding": "temperature-conversion"
  }
}
```
