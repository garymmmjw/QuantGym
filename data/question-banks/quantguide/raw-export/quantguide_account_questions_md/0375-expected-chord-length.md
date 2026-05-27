# QuantGuide Question

## 375. Expected Chord Length

**Metadata**

- ID: `a0BEfm8dWv1EyAFvCg4S`
- URL: https://www.quantguide.io/questions/expected-chord-length
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 4
- Companies: Jane Street
- Source: N/A
- Tags: Continuous Random Variables, Expected Value
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-8 09:42:42 America/New_York
- Last Edited By: Gabe

### 题干

Two points are uniformly at random selected from the circumference of the unit circle. Find the expected length of the chord (line segment) between the two points. The answer is in the form $\dfrac{a}{\pi}$ for some rational number $a$. Find $a$.

### Hint

Let $\theta$ and $\phi$ be IID $\text{Unif}(0,2\pi)$. Picking the two angles is equivalent to picking the two points uniform on the circumference. The measure of the angle between $\theta$ and $\phi$ is $\theta - \phi$. To get the length of the line segment connecting the two points, we can take a slight shortcut. The length here only depends on the distance between our points we select in terms of angle. Use this to fix one of the points at $(1,0)$.

### 解答

Let $\theta$ and $\phi$ be IID $\text{Unif}(0,2\pi)$. Picking the two angles is equivalent to picking the two points uniform on the circumference. The measure of the angle between $\theta$ and $\phi$ is $\theta - \phi$. To get the length of the line segment connecting the two points, we can take a slight shortcut. The length here only depends on the distance between our points we select in terms of angle. In other words, regardless of where we end up having our points located, we can just rotate the circle so that one of them is located at $(1,0)$. Therefore, we can arbitrarily fix $\theta_1 = 0$. Thus, the length between $\theta_1 = 0$ and the point at $\theta_2 = \theta$ is $\sqrt{(1 - \cos(\theta))^2 + \sin^2(\theta)} = \sqrt{2} \sqrt{1 - \cos(\theta)}$. This means that finding the expected length of the chord is equivalent to finding $\sqrt{2}\mathbb{E}[\sqrt{1 - \cos(\theta)}]$, where $\theta \sim \text{Unif}(0,2\pi)$.   $$$$  Now, $\sqrt{2}\mathbb{E}[\sqrt{1 - \cos\theta}] = \dfrac{\sqrt{2}}{2\pi}\displaystyle \int_0^{2\pi}\sqrt{1-\cos\theta}d\theta$. Now, the best approach is to conjugate the interior by multiplying and dividing by $\sqrt{1+\cos\theta}$ so that we get $\sqrt{1-\cos^2\theta} = |\sin\theta|$. Doing this, we get $\dfrac{\sqrt{2}}{2\pi}\displaystyle \int_0^{2\pi} \dfrac{|\sin\theta|}{\sqrt{1+\cos\theta}}d\theta$.   $$$$  Note that the region on $(0,\pi)$ and $(\pi,2\pi)$, our integrand is symmetric, so we can just evaluate over one interval and double it. This means our new integral is $\dfrac{\sqrt{2}}{\pi} \displaystyle \int_0^{\pi} \dfrac{\sin\theta}{\sqrt{1+\cos\theta}}d\theta$. Let $u = 1 + \cos\theta$. Then $du = -\sin\theta d\theta$. Our bounds would respectively become $2$ and $0$, but the negative from the $du$ flips them back. Therefore, our new integral is $\dfrac{\sqrt{2}}{\pi} \displaystyle \int_0^2 u^{-\frac{1}{2}}du$. Evaluating this, we get $\dfrac{2\sqrt{2}}{\pi} \cdot \sqrt{u} \Big|_0^2 = \dfrac{4}{\pi}$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "4"
    ],
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "a0BEfm8dWv1EyAFvCg4S",
    "internalDifficulty": 4,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-8 09:42:42 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2910313,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Expected Chord Length",
    "topic": "probability",
    "urlEnding": "expected-chord-length",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "hard",
    "id": "a0BEfm8dWv1EyAFvCg4S",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Expected Chord Length",
    "topic": "probability",
    "urlEnding": "expected-chord-length"
  }
}
```
