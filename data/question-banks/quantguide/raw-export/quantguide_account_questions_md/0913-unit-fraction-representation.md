# QuantGuide Question

## 913. Unit Fraction Representation

**Metadata**

- ID: `K46BC67291FYfrXsKz3e`
- URL: https://www.quantguide.io/questions/unit-fraction-representation
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 2
- Companies: IMC
- Source: IMC (significantly harder)
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-29 10:06:44 America/New_York
- Last Edited By: Gabe

### 题干

Assume, without proof, that every rational number $0 < q < 1$ can be represented as the sum of unit fractions. For example, $$\dfrac{4}{5} = \dfrac{1}{2} + \dfrac{1}{4} + \dfrac{1}{20}$$ Find the largest denominator in the unit fraction representation of $\dfrac{179}{720}$ that has the fewest terms and largest possible maximum denominator. In the example above, the answer would be $10$.

### Hint

We can see that $\dfrac{1}{5} < \dfrac{179}{720} < \dfrac{1}{4}$, so $\dfrac{1}{5}$ is our first fraction in our sum.

### 解答

We can see that $\dfrac{1}{5} < \dfrac{179}{720} < \dfrac{1}{4}$, so $\dfrac{1}{5}$ is our first fraction. Then, $\dfrac{179}{720} - \dfrac{1}{5} = \dfrac{35}{720} = \dfrac{7}{144}$. At this point, we see that $\dfrac{1}{20} < \dfrac{7}{144} < \dfrac{1}{21}$, so we should next add $\dfrac{1}{21}$ to our total. Now, $\dfrac{7}{144} - \dfrac{1}{21} = \dfrac{3}{3024} = \dfrac{1}{1008}$. Therefore, the largest denominator is $1008$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1008"
    ],
    "companies": [
      {
        "company": "IMC"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "K46BC67291FYfrXsKz3e",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-29 10:06:44 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7477992,
    "source": "IMC (significantly harder)",
    "status": "published",
    "tags": [],
    "title": "Unit Fraction Representation",
    "topic": "brainteasers",
    "urlEnding": "unit-fraction-representation",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "IMC"
      }
    ],
    "difficulty": "medium",
    "id": "K46BC67291FYfrXsKz3e",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Unit Fraction Representation",
    "topic": "brainteasers",
    "urlEnding": "unit-fraction-representation"
  }
}
```
